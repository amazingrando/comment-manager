import { createHash, randomBytes } from "node:crypto";

const HANDOFF_TTL_MS = 10 * 60 * 1000;

export type PluginSessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; handle: string; email: string };
};

type Handoff = {
  writeKeyHash: string;
  payload: PluginSessionPayload | null;
  expiresAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __commentManagerHandoffs?: Map<string, Handoff>;
};

function store() {
  if (!globalStore.__commentManagerHandoffs) {
    globalStore.__commentManagerHandoffs = new Map();
  }
  return globalStore.__commentManagerHandoffs;
}

function prune(now = Date.now()) {
  const handoffs = store();
  for (const [readKey, row] of handoffs) {
    if (row.expiresAt < now) handoffs.delete(readKey);
  }
}

export function hashWriteKey(writeKey: string) {
  return createHash("sha256").update(writeKey).digest("hex");
}

export function newHandoffKeys() {
  return {
    readKey: randomBytes(24).toString("hex"),
    writeKey: randomBytes(24).toString("hex"),
  };
}

export function createHandoff(readKey: string, writeKey: string) {
  prune();
  store().set(readKey, {
    writeKeyHash: hashWriteKey(writeKey),
    payload: null,
    expiresAt: Date.now() + HANDOFF_TTL_MS,
  });
}

export function writeHandoffPayload(
  writeKey: string,
  payload: PluginSessionPayload,
) {
  prune();
  const writeHash = hashWriteKey(writeKey);
  const now = Date.now();
  for (const row of store().values()) {
    if (row.writeKeyHash === writeHash && row.expiresAt >= now) {
      row.payload = payload;
      return;
    }
  }
  throw new Error("OAuth handoff expired or was not found");
}

export function readHandoff(readKey: string) {
  const handoffs = store();
  const row = handoffs.get(readKey);
  if (!row) return { status: "missing" as const };
  if (row.expiresAt < Date.now()) {
    handoffs.delete(readKey);
    return { status: "expired" as const };
  }
  if (!row.payload) return { status: "pending" as const };
  handoffs.delete(readKey);
  return { status: "ready" as const, payload: row.payload };
}

export function resetHandoffsForTests() {
  store().clear();
}
