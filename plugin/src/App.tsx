import { useEffect, useMemo, useState } from "react";
import type { Column, EditTarget } from "@comment-manager/shared";
import { addColumn, boardMode, renameColumn } from "@comment-manager/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAuthedClient,
  pollSession,
  postToMain,
  startOAuth,
  syncBoard,
} from "./api";
import { Board } from "./Board";
import {
  applyDeleteColumn,
  applyReset,
  saveColumnSet,
} from "./columns-api";
import type { MainToUi } from "./messages";
import type { BoardCard, BoardPayload, PluginSession } from "./types";

export function App() {
  const [fileKey, setFileKey] = useState("");
  const [fileName, setFileName] = useState("");
  const [session, setSession] = useState<PluginSession | null>(null);
  const [ready, setReady] = useState(false);
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<EditTarget>("file");
  const [showIgnored, setShowIgnored] = useState(false);
  const [newColumn, setNewColumn] = useState("");
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data?.pluginMessage as MainToUi | undefined;
      if (!msg) return;
      if (msg.type === "init") {
        setFileKey(msg.fileKey);
        setFileName(msg.fileName);
        setSession(msg.session);
        if (msg.session) setSupabase(createAuthedClient(msg.session));
        setReady(true);
      }
    }
    window.addEventListener("message", onMessage);
    postToMain({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready || !session || !fileKey) return;
    let cancelled = false;
    setBusy(true);
    syncBoard(session, fileKey)
      .then((payload) => {
        if (!cancelled) setBoard(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load the board");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, session, fileKey]);

  const mode = boardMode(Boolean(board?.fileIsCustom), target);
  const visibleColumns: Column[] = useMemo(() => {
    if (!board) return [];
    return mode === "default-editor" ? board.defaultColumns : board.columns;
  }, [board, mode]);

  async function signIn() {
    setError(null);
    setBusy(true);
    try {
      const { readKey, authorizeUrl } = await startOAuth();
      window.open(authorizeUrl, "_blank");
      const next = await pollSession(readKey);
      setSession(next);
      setSupabase(createAuthedClient(next));
      postToMain({ type: "store-session", session: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setSession(null);
    setBoard(null);
    setSupabase(null);
    postToMain({ type: "clear-session" });
  }

  async function persistColumns(next: Column[]) {
    if (!supabase || !session || !board) return;
    const editingDefault = target === "default";
    const fileKeyForSet = editingDefault ? null : fileKey;
    await saveColumnSet(supabase, {
      userId: session.user.id,
      fileKey: fileKeyForSet,
      columns: next,
    });
    setBoard((current) => {
      if (!current) return current;
      if (editingDefault) {
        const stillFollowing = !current.fileIsCustom;
        return {
          ...current,
          defaultColumns: next,
          columns: stillFollowing ? next : current.columns,
        };
      }
      return { ...current, columns: next, fileIsCustom: true };
    });
  }

  if (!ready) {
    return <p className="pad">Loading…</p>;
  }

  if (!fileKey) {
    return (
      <main className="pad">
        <h1>Comment Manager</h1>
        <p>Save the file in Figma, then run the plugin again. A file key is required to load comments.</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="pad">
        <h1>Comment Manager</h1>
        <p>Sign in with Figma to capture root comments in this file and keep a personal board.</p>
        {error ? <p className="error">{error}</p> : null}
        <button type="button" disabled={busy} onClick={() => void signIn()}>
          {busy ? "Waiting for Figma…" : "Sign in with Figma"}
        </button>
      </main>
    );
  }

  if (error && !board) {
    return (
      <main className="pad">
        <p className="error">{error}</p>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </main>
    );
  }

  if (!board || busy) {
    return <p className="pad">Loading comments…</p>;
  }

  const visibleCards = board.cards;
  const emptyBoard =
    mode === "file-board" &&
    visibleCards.filter((card) => showIgnored || !card.ignored_at).length === 0;

  return (
    <main className="app">
      <header className="top">
        <div>
          <strong>Comment Manager</strong>
          <span className="muted"> {fileName}</span>
        </div>
        <label className="toggle">
          <span>Edit this file</span>
          <input
            type="radio"
            name="target"
            checked={target === "file"}
            onChange={() => setTarget("file")}
          />
        </label>
        <label className="toggle">
          <span>Edit my default</span>
          <input
            type="radio"
            name="target"
            checked={target === "default"}
            onChange={() => setTarget("default")}
          />
        </label>
        {board.fileIsCustom && target === "file" ? (
          <button
            type="button"
            onClick={() => {
              if (!supabase || !session) return;
              applyReset(supabase, {
                userId: session.user.id,
                fileKey,
                customColumns: board.columns,
                defaultColumns: board.defaultColumns,
                cards: board.cards,
              })
                .then(() =>
                  setBoard((current) =>
                    current
                      ? {
                          ...current,
                          fileIsCustom: false,
                          columns: current.defaultColumns,
                        }
                      : current,
                  ),
                )
                .catch((err: unknown) =>
                  setError(err instanceof Error ? err.message : "Reset failed"),
                );
            }}
          >
            Reset to default
          </button>
        ) : null}
        <label>
          <input
            type="checkbox"
            checked={showIgnored}
            onChange={(event) => setShowIgnored(event.target.checked)}
          />
          Show ignored
        </label>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {mode === "default-editor" ? (
        <p className="banner">
          You are editing the default columns. This file’s cards are hidden until
          you switch back to Edit this file.
        </p>
      ) : null}
      {emptyBoard && mode === "file-board" ? (
        <p className="pad">
          No open root comments in this file. New comments appear the next time
          you open the plugin.
        </p>
      ) : null}
      <Board
        columns={visibleColumns}
        cards={mode === "default-editor" ? [] : visibleCards}
        showIgnored={showIgnored}
        onMove={(cardId, columnId) => {
          if (!supabase) return;
          const card = board.cards.find((row) => row.id === cardId);
          if (!card || card.column_id === columnId) return;
          const nextRank =
            Math.max(
              0,
              ...board.cards
                .filter((row) => row.column_id === columnId)
                .map((row) => row.sort_rank),
            ) + 1;
          void supabase
            .from("cards")
            .update({
              column_id: columnId,
              sort_rank: nextRank,
              updated_at: new Date().toISOString(),
            })
            .eq("id", cardId)
            .then(({ error: updateError }) => {
              if (updateError) setError(updateError.message);
            });
          setBoard((current) =>
            current
              ? {
                  ...current,
                  cards: current.cards.map((row) =>
                    row.id === cardId
                      ? { ...row, column_id: columnId, sort_rank: nextRank }
                      : row,
                  ),
                }
              : current,
          );
        }}
        onRename={(columnId, name) => {
          const next = renameColumn(visibleColumns, columnId, name);
          void persistColumns(next).catch((err: unknown) =>
            setError(err instanceof Error ? err.message : "Could not rename"),
          );
        }}
        onDelete={(columnId) => {
          if (!supabase || !session) return;
          const editingDefault = target === "default";
          applyDeleteColumn(supabase, {
            userId: session.user.id,
            fileKey: editingDefault ? null : fileKey,
            columns: visibleColumns,
            columnId,
            cards: editingDefault ? [] : board.cards,
          })
            .then((result) => {
              setBoard((current) => {
                if (!current) return current;
                const cards = editingDefault
                  ? current.cards
                  : current.cards.map((card) =>
                      card.column_id === columnId
                        ? { ...card, column_id: result.destinationId }
                        : card,
                    );
                if (editingDefault) {
                  const stillFollowing = !current.fileIsCustom;
                  return {
                    ...current,
                    defaultColumns: result.columns,
                    columns: stillFollowing ? result.columns : current.columns,
                    cards,
                  };
                }
                return {
                  ...current,
                  columns: result.columns,
                  fileIsCustom: true,
                  cards,
                };
              });
            })
            .catch((err: unknown) =>
              setError(err instanceof Error ? err.message : "Could not delete"),
            );
        }}
        onOpen={(card) => postToMain({ type: "jump", nodeId: card.node_id })}
        onIgnore={(card) => updateIgnore(card, new Date().toISOString())}
        onUnignore={(card) => updateIgnore(card, null)}
      />
      <form
        className="add"
        onSubmit={(event) => {
          event.preventDefault();
          const name = newColumn.trim();
          if (!name) return;
          const next = addColumn(visibleColumns, name, crypto.randomUUID());
          setNewColumn("");
          void persistColumns(next).catch((err: unknown) =>
            setError(err instanceof Error ? err.message : "Could not add column"),
          );
        }}
      >
        <input
          value={newColumn}
          onChange={(event) => setNewColumn(event.target.value)}
          placeholder="New column"
        />
        <button type="submit">Add column</button>
      </form>
    </main>
  );

  function updateIgnore(card: BoardCard, ignoredAt: string | null) {
    if (!supabase) return;
    void supabase
      .from("cards")
      .update({ ignored_at: ignoredAt, updated_at: new Date().toISOString() })
      .eq("id", card.id)
      .then(({ error: updateError }) => {
        if (updateError) setError(updateError.message);
      });
    setBoard((current) =>
      current
        ? {
            ...current,
            cards: current.cards.map((row) =>
              row.id === card.id ? { ...row, ignored_at: ignoredAt } : row,
            ),
          }
        : current,
    );
  }
}
