/// <reference types="@figma/plugin-typings" />

import {
  emptyBoard,
  isBoardPayload,
  mergeComments,
  moveCard,
} from "./board-state";
import type {
  BoardPayload,
  MainToUi,
  PluginSession,
  UiToMain,
} from "./messages";
import type { FigmaApiComment } from "@comment-manager/shared";

const SESSION_KEY = "session";
const AUTH_SITE_URL = __AUTH_SITE_URL__;

let session: PluginSession | null = null;
let board: BoardPayload | null = null;
let syncing = false;

try {
  figma.showUI(__html__, {
    width: 760,
    height: 520,
    themeColors: true,
    title: "Comment Manager",
  });
} catch (error) {
  figma.notify(
    `Comment Manager failed to open: ${error instanceof Error ? error.message : "unknown error"}`,
    { error: true },
  );
  figma.closePlugin();
}

function post(msg: MainToUi) {
  figma.ui.postMessage(msg);
}

function boardKey(userId: string, fileKey: string) {
  return `board:${userId}:${fileKey}`;
}

figma.ui.onmessage = (raw: UiToMain | { pluginMessage?: UiToMain }) => {
  const msg =
    raw && typeof raw === "object" && "pluginMessage" in raw
      ? raw.pluginMessage
      : raw;
  if (!msg || typeof msg !== "object" || !("type" in msg)) return;

  if (msg.type === "ready") {
    void sendInit();
    return;
  }

  if (msg.type === "store-session") {
    void saveSession(msg.session);
    return;
  }

  if (msg.type === "clear-session") {
    void signOut();
    return;
  }

  if (msg.type === "sync") {
    void syncComments();
    return;
  }

  if (msg.type === "move-card") {
    void persistMove(msg.cardId, msg.columnId);
    return;
  }

  if (msg.type === "jump") {
    void openCommentPin(msg.nodeId, msg.x, msg.y);
  }
};

function isSession(value: unknown): value is PluginSession {
  if (!value || typeof value !== "object") return false;
  const row = value as PluginSession;
  return (
    typeof row.access_token === "string" &&
    typeof row.refresh_token === "string" &&
    typeof row.expires_at === "number" &&
    !!row.user &&
    typeof row.user.id === "string"
  );
}

async function sendInit() {
  const stored = await figma.clientStorage.getAsync(SESSION_KEY);
  session = isSession(stored) ? stored : null;
  const fileKey = figma.fileKey ?? "";
  if (session && fileKey) {
    board = await loadBoard(session.user.id, fileKey);
  } else {
    board = null;
  }
  post({
    type: "init",
    fileKey,
    fileName: figma.root.name,
    user: session?.user ?? null,
    board,
  });
}

async function saveSession(next: PluginSession) {
  session = next;
  await figma.clientStorage.setAsync(SESSION_KEY, next);
  const fileKey = figma.fileKey ?? "";
  if (fileKey) {
    board = await loadBoard(next.user.id, fileKey);
    post({ type: "board", board });
    await syncComments();
  }
}

async function signOut() {
  session = null;
  board = null;
  await figma.clientStorage.deleteAsync(SESSION_KEY);
  post({ type: "signed-out" });
}

async function loadBoard(userId: string, fileKey: string): Promise<BoardPayload> {
  const stored = await figma.clientStorage.getAsync(boardKey(userId, fileKey));
  if (isBoardPayload(stored) && stored.columns.length > 0) {
    return { ...stored, fileKey };
  }
  const created = emptyBoard(fileKey);
  await figma.clientStorage.setAsync(boardKey(userId, fileKey), created);
  return created;
}

async function persistBoard(next: BoardPayload) {
  if (!session) return;
  const fileKey = figma.fileKey ?? next.fileKey;
  board = { ...next, fileKey };
  await figma.clientStorage.setAsync(
    boardKey(session.user.id, fileKey),
    board,
  );
}

async function persistMove(cardId: string, columnId: string) {
  if (!board) return;
  const next = moveCard(board, cardId, columnId);
  if (next === board) return;
  await persistBoard(next);
}

async function syncComments() {
  if (!session || syncing) return;
  const fileKey = figma.fileKey ?? "";
  if (!fileKey) return;
  syncing = true;
  try {
    session = await ensureAccessToken(session);
    if (!board) board = await loadBoard(session.user.id, fileKey);
    const comments = await listFileComments(session.access_token, fileKey);
    const next = mergeComments(board, comments);
    await persistBoard(next);
    post({ type: "board", board: next });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not sync comments";
    if (message === "Sign in expired. Try again.") {
      await signOut();
    }
    post({ type: "error", message });
  } finally {
    syncing = false;
  }
}

async function ensureAccessToken(
  current: PluginSession,
): Promise<PluginSession> {
  const skewSeconds = 60;
  if (current.expires_at > Math.floor(Date.now() / 1000) + skewSeconds) {
    return current;
  }
  if (!current.refresh_token) {
    throw new Error("Sign in expired. Try again.");
  }
  const response = await fetch(`${AUTH_SITE_URL}/api/plugin/oauth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: current.refresh_token }),
  });
  if (!response.ok) {
    throw new Error("Sign in expired. Try again.");
  }
  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
  if (!body.access_token || !body.expires_at) {
    throw new Error("Sign in expired. Try again.");
  }
  const next: PluginSession = {
    ...current,
    access_token: body.access_token,
    refresh_token: body.refresh_token || current.refresh_token,
    expires_at: body.expires_at,
  };
  session = next;
  await figma.clientStorage.setAsync(SESSION_KEY, next);
  return next;
}

async function listFileComments(accessToken: string, fileKey: string) {
  const response = await fetch(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/comments`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 401 || response.status === 403) {
    throw new Error("Sign in expired. Try again.");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not load comments (${response.status}): ${text}`);
  }
  const data = (await response.json()) as { comments?: FigmaApiComment[] };
  return data.comments ?? [];
}

async function openCommentPin(
  nodeId: string | null,
  x: number | null,
  y: number | null,
) {
  try {
    const jumped = await jumpToComment(nodeId, x, y);
    if (!jumped) {
      figma.notify("Could not find that comment on the canvas.");
    }
  } catch (error) {
    figma.notify(
      error instanceof Error ? error.message : "Could not jump to the comment.",
      { error: true },
    );
  }
}

async function getNode(id: string): Promise<BaseNode | null> {
  return (
    (await figma.getNodeByIdAsync(id)) ??
    (await figma.getNodeByIdAsync(id.replace(/-/g, ":"))) ??
    (await figma.getNodeByIdAsync(id.replace(/:/g, "-")))
  );
}

async function switchToPage(node: BaseNode) {
  let current: BaseNode | null = node;
  while (current && current.type !== "PAGE") {
    current = current.parent;
  }
  if (!current || current.type !== "PAGE") return;
  const api = figma as PluginAPI & {
    setCurrentPageAsync?: (page: PageNode) => Promise<void>;
  };
  if (api.setCurrentPageAsync) {
    await api.setCurrentPageAsync(current);
    return;
  }
  figma.currentPage = current;
}

function showPin(x: number, y: number) {
  figma.viewport.zoom = 1;
  const { width } = figma.viewport.bounds;
  figma.viewport.center = {
    x: x + width * 0.22,
    y,
  };
}

async function jumpToComment(
  nodeId: string | null,
  x: number | null,
  y: number | null,
): Promise<boolean> {
  if (nodeId) {
    let node = await getNode(nodeId);
    if (!node) {
      await figma.loadAllPagesAsync();
      node = await getNode(nodeId);
    }
    if (node) {
      await switchToPage(node);
      if (node.type === "PAGE" || node.type === "DOCUMENT") {
        if (x != null && y != null) {
          showPin(x, y);
          return true;
        }
        return false;
      }
      if ("absoluteTransform" in node) {
        const scene = node as SceneNode;
        if (x != null && y != null) {
          showPin(
            scene.absoluteTransform[0][2] + x,
            scene.absoluteTransform[1][2] + y,
          );
        } else {
          figma.viewport.scrollAndZoomIntoView([scene]);
        }
        return true;
      }
    }
  }

  if (x != null && y != null) {
    showPin(x, y);
    return true;
  }

  return false;
}
