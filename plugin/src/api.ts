import type { PluginSession } from "./messages";

export const AUTH_SITE_URL = __AUTH_SITE_URL__;

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
