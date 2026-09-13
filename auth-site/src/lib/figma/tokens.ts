import { createAdminClient } from "@/lib/supabase/admin";
import {
  sealOAuthToken,
  sealOAuthTokenOrNull,
  unsealOAuthToken,
  unsealOAuthTokenOrNull,
} from "@/lib/crypto/oauth-token";
import { refreshFigmaToken } from "@/lib/figma/oauth";

export async function persistFigmaOAuthTokens(input: {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("figma_user_tokens").upsert({
    user_id: input.userId,
    access_token: sealOAuthToken(input.accessToken),
    refresh_token: sealOAuthTokenOrNull(input.refreshToken),
    expires_at: input.expiresAt,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

type TokenRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

export async function getValidFigmaAccessToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("figma_user_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  const row = data as TokenRow | null;
  if (!row) {
    throw new Error("No Figma token. Sign in again.");
  }

  const access = unsealOAuthToken(row.access_token);
  const refresh = unsealOAuthTokenOrNull(row.refresh_token);
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : 0;
  const stale = expiresAt > 0 && expiresAt < Date.now() + 60_000;

  if (!stale) return access;
  if (!refresh) return access;

  const tokens = await refreshFigmaToken(refresh);
  const expires = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  await persistFigmaOAuthTokens({
    userId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refresh,
    expiresAt: expires,
  });
  return tokens.access_token;
}
