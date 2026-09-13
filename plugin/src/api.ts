import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BoardPayload, PluginSession } from "./types";

export const AUTH_SITE_URL = __AUTH_SITE_URL__;
export const PLUGIN_ID = __PLUGIN_ID__;

export function postToMain(pluginMessage: unknown) {
  parent.postMessage({ pluginMessage }, "*");
}

export async function startOAuth(): Promise<{
  readKey: string;
  authorizeUrl: string;
}> {
  const response = await fetch(`${AUTH_SITE_URL}/api/plugin/oauth/start`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Could not start sign in");
  }
  return response.json();
}

export async function pollSession(readKey: string): Promise<PluginSession> {
  for (let i = 0; i < 60; i += 1) {
    const response = await fetch(
      `${AUTH_SITE_URL}/api/plugin/oauth/poll?readKey=${encodeURIComponent(readKey)}`,
    );
    if (response.status === 202) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      continue;
    }
    if (!response.ok) {
      throw new Error("Sign in expired. Try again.");
    }
    const body = (await response.json()) as {
      session?: PluginSession;
    };
    if (!body.session) throw new Error("Sign in returned no session");
    return body.session;
  }
  throw new Error("Sign in timed out");
}

export async function syncBoard(
  session: PluginSession,
  fileKey: string,
): Promise<BoardPayload> {
  const response = await fetch(`${AUTH_SITE_URL}/api/plugin/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileKey }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Could not sync comments");
  }
  return body as BoardPayload;
}

export function createAuthedClient(session: PluginSession): SupabaseClient {
  if (!__SUPABASE_ANON_KEY__) {
    throw new Error(
      "Plugin was built without PLUGIN_SUPABASE_ANON_KEY. Restart npm run dev:plugin.",
    );
  }
  const client = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  void client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return client;
}
