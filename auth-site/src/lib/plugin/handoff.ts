import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

const HANDOFF_TTL_MS = 10 * 60 * 1000;

export type PluginSessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; handle: string; email: string };
};

export function hashWriteKey(writeKey: string) {
  return createHash("sha256").update(writeKey).digest("hex");
}

export function newHandoffKeys() {
  return {
    readKey: randomBytes(24).toString("hex"),
    writeKey: randomBytes(24).toString("hex"),
  };
}

export async function createHandoff(readKey: string, writeKey: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("plugin_oauth_handoffs").insert({
    read_key: readKey,
    write_key_hash: hashWriteKey(writeKey),
    payload: null,
    expires_at: new Date(Date.now() + HANDOFF_TTL_MS).toISOString(),
  });
  if (error) throw error;
}

export async function writeHandoffPayload(
  writeKey: string,
  payload: PluginSessionPayload,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plugin_oauth_handoffs")
    .update({ payload: payload as unknown as Json })
    .eq("write_key_hash", hashWriteKey(writeKey))
    .gt("expires_at", new Date().toISOString())
    .select("read_key")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("OAuth handoff expired or was not found");
}

export async function readHandoff(readKey: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plugin_oauth_handoffs")
    .select("payload, expires_at")
    .eq("read_key", readKey)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { status: "missing" as const };
  if (Date.parse(data.expires_at) < Date.now()) {
    await admin.from("plugin_oauth_handoffs").delete().eq("read_key", readKey);
    return { status: "expired" as const };
  }
  if (!data.payload) return { status: "pending" as const };
  await admin.from("plugin_oauth_handoffs").delete().eq("read_key", readKey);
  return {
    status: "ready" as const,
    payload: data.payload as unknown as PluginSessionPayload,
  };
}
