import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAuthedClient,
  pollSession,
  postToMain,
  startOAuth,
  syncBoard,
} from "./api";
import { Board } from "./Board";
import type { MainToUi } from "./messages";
import type { BoardPayload, PluginSession } from "./types";

const LIVE_SYNC_MS = 5_000;

export function App() {
  const [fileKey, setFileKey] = useState("");
  const [fileName, setFileName] = useState("");
  const [session, setSession] = useState<PluginSession | null>(null);
  const [ready, setReady] = useState(false);
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const syncingRef = useRef(false);

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

  const refreshBoard = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session || !fileKey || syncingRef.current) return;
      const silent = options?.silent ?? false;
      syncingRef.current = true;
      if (!silent) {
        setBusy(true);
        setError(null);
      }
      try {
        setBoard(await syncBoard(session, fileKey));
      } catch (err: unknown) {
        if (!silent) {
          setError(
            err instanceof Error ? err.message : "Could not load the board",
          );
        }
      } finally {
        syncingRef.current = false;
        if (!silent) setBusy(false);
      }
    },
    [session, fileKey],
  );

  useEffect(() => {
    if (!ready || !session || !fileKey) return;
    void refreshBoard();
    const timer = window.setInterval(() => {
      void refreshBoard({ silent: true });
    }, LIVE_SYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshBoard({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, session, fileKey, refreshBoard]);

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

  if (!ready) {
    return <p className="pad">Loading…</p>;
  }

  if (!fileKey) {
    return (
      <main className="pad">
        <h1>Comment Manager</h1>
        <p>
          This file has no key yet. Save it with File → Save (or ⌘S), then run
          the plugin again. A file key is required to load comments.
        </p>
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

  if (!board) {
    return <p className="pad">{busy ? "Loading comments…" : "Could not load the board."}</p>;
  }

  const emptyBoard = board.cards.length === 0;

  return (
    <main className="app">
      <header className="top">
        <div>
          <strong>Comment Manager</strong>
          <span className="muted"> {fileName}</span>
        </div>
        <button type="button" disabled={busy} onClick={() => void refreshBoard()}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {emptyBoard ? (
        <p className="pad">
          No open root comments in this file. New pins appear here within a few
          seconds.
        </p>
      ) : null}
      <Board
        columns={board.columns}
        cards={board.cards}
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
        onOpen={(card) => postToMain({ type: "jump", nodeId: card.node_id })}
      />
    </main>
  );
}
