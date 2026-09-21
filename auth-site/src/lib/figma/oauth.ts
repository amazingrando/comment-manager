import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import {
  figmaMeSchema,
  figmaTokenResponseSchema,
  type FigmaTokenResponse,
  type FigmaUser,
} from "@/lib/oauth/schemas";

export const FIGMA_SCOPES = [
  "current_user:read",
  "file_comments:read",
  "file_content:read",
  "file_metadata:read",
].join(" ");

const STATE_COOKIE = "figma_oauth_state";
const WRITE_KEY_COOKIE = "figma_oauth_write_key";

export type { FigmaTokenResponse, FigmaUser };

export function tokenExpiresAt(expiresIn?: number) {
  const seconds = expiresIn ?? 60 * 60 * 24 * 90;
  return Math.floor(Date.now() / 1000) + seconds;
}

export function resolveFigmaOAuthRedirectUri(input: {
  appUrl: string;
  explicitRedirectUri?: string;
}) {
  const explicit = input.explicitRedirectUri?.trim();
  const raw = explicit
    ? explicit
    : `${input.appUrl.replace(/\/$/, "")}/api/oauth/figma/callback`;
  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return `${url.origin}${url.pathname}`;
}

function currentFigmaOAuthRedirectUri() {
  const { appUrl, figmaOAuthRedirectUri } = serverEnv();
  return resolveFigmaOAuthRedirectUri({
    appUrl,
    explicitRedirectUri: figmaOAuthRedirectUri,
  });
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  };
}

export async function createOAuthState(writeKey: string) {
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  const base = cookieBase();
  cookieStore.set(STATE_COOKIE, state, base);
  cookieStore.set(WRITE_KEY_COOKIE, writeKey, base);
  return state;
}

export async function readOAuthCookies() {
  const cookieStore = await cookies();
  const state = cookieStore.get(STATE_COOKIE)?.value ?? null;
  const writeKey = cookieStore.get(WRITE_KEY_COOKIE)?.value ?? null;
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(WRITE_KEY_COOKIE);
  return { state, writeKey };
}

export function figmaAuthorizeUrl(state: string) {
  const { figmaClientId } = serverEnv();
  const url = new URL("https://www.figma.com/oauth");
  url.searchParams.set("client_id", figmaClientId);
  url.searchParams.set("redirect_uri", currentFigmaOAuthRedirectUri());
  url.searchParams.set("scope", FIGMA_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

function basicAuthHeader() {
  const { figmaClientId, figmaClientSecret } = serverEnv();
  return `Basic ${Buffer.from(`${figmaClientId}:${figmaClientSecret}`).toString("base64")}`;
}

export async function exchangeFigmaCode(code: string) {
  const body = new URLSearchParams({
    redirect_uri: currentFigmaOAuthRedirectUri(),
    code,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Figma token exchange failed: ${text}`);
  }

  return figmaTokenResponseSchema.parse(await response.json());
}

export async function refreshFigmaToken(refreshToken: string) {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://api.figma.com/v1/oauth/refresh", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Figma token refresh failed: ${text}`);
  }

  return figmaTokenResponseSchema.parse(await response.json());
}

export async function fetchFigmaMe(accessToken: string) {
  const response = await fetch("https://api.figma.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Figma /me failed: ${text}`);
  }
  return figmaMeSchema.parse(await response.json());
}
