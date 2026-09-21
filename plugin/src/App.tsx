import { useCallback, useEffect, useRef, useState } from "react";
import { pollSession, postToMain, startOAuth } from "./api";
import { moveCard } from "./board-state";
import { Board } from "./Board";
import type { MainToUi } from "./messages";
import type { BoardPayload, PluginUser } from "./types";

const LIVE_SYNC_MS = 5_000;

export function App() {
  const [fileKey, setFileKey] = useState("");
  const [fileName, setFileName] = useState("");
  const [user, setUser] = useState<PluginUser | null>(null);
  const [ready, setReady] = useState(false);
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boardRef = useRef<BoardPayload | null>(null);
  boardRef.current = board;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data?.pluginMessage as MainToUi | undefined;
      if (!msg) return;
      if (msg.type === "init") {
        setFileKey(msg.fileKey);
        setFileName(msg.fileName);
        setUser(msg.user);
        setBoard(msg.board);
        setReady(true);
        return;
      }
      if (msg.type === "board") {
        setBoard(msg.board);
        setBusy(false);
        return;
      }
      if (msg.type === "signed-out") {
        setUser(null);
        setBoard(null);
        setBusy(false);
        return;
      }
      if (msg.type === "error") {
        setBusy(false);
        if (
          !boardRef.current ||
          msg.message === "Sign in expired. Try again."
        ) {
          setError(msg.message);
        }
      }
    }
    window.addEventListener("message", onMessage);
    postToMain({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const refreshBoard = useCallback(
    (options?: { silent?: boolean }) => {
      if (!user || !fileKey) return;
      if (!options?.silent) {
        setBusy(true);
        setError(null);
      }
      postToMain({ type: "sync" });
    },
    [user, fileKey],
  );

  useEffect(() => {
    if (!ready || !user || !fileKey) return;
    refreshBoard();
    const timer = window.setInterval(() => {
      refreshBoard({ silent: true });
    }, LIVE_SYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshBoard({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, user, fileKey, refreshBoard]);

  async function signIn() {
    setError(null);
    setBusy(true);
    try {
      const { readKey, authorizeUrl } = await startOAuth();
      window.open(authorizeUrl, "_blank");
      const next = await pollSession(readKey);
      setUser(next.user);
      postToMain({ type: "store-session", session: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  function signOut() {
    setUser(null);
    setBoard(null);
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

  if (!user) {
    return (
      <main className="pad">
        <h1>Comment Manager</h1>
        <p>
          Sign in with Figma to capture root comments in this file and keep a
          personal board.
        </p>
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
    return (
      <p className="pad">{busy ? "Loading comments…" : "Could not load the board."}</p>
    );
  }

  const emptyBoard = board.cards.length === 0;

  return (
    <main className="app">
      <header className="top">
        <div>
          <strong>Comment Manager</strong>
          <span className="muted"> {fileName}</span>
        </div>
        <button type="button" disabled={busy} onClick={() => refreshBoard()}>
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
          setBoard((current) =>
            current ? moveCard(current, cardId, columnId) : current,
          );
          postToMain({ type: "move-card", cardId, columnId });
        }}
        onOpen={(card) =>
          postToMain({
            type: "jump",
            nodeId: card.node_id,
            x: card.pin_x,
            y: card.pin_y,
          })
        }
      />
    </main>
  );
}
