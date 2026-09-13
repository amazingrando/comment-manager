import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeFigmaCode,
  fetchFigmaMe,
  readOAuthCookies,
} from "@/lib/figma/oauth";
import { persistFigmaOAuthTokens } from "@/lib/figma/tokens";
import {
  createSupabaseSession,
  ensureDefaultColumnSet,
  resolveFigmaAuthUserId,
} from "@/lib/auth/figma-user";
import { writeHandoffPayload } from "@/lib/plugin/handoff";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const { state: expected, writeKey } = await readOAuthCookies();

  if (!code || !state || !expected || state !== expected || !writeKey) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  try {
    const tokens = await exchangeFigmaCode(code);
    const figmaUser = await fetchFigmaMe(tokens.access_token);
    const figmaUserId = String(figmaUser.id);
    const admin = createAdminClient();

    const userId = await resolveFigmaAuthUserId({
      figmaUserId,
      email: figmaUser.email,
    });

    const { error: profileError } = await admin.from("users").upsert({
      id: userId,
      figma_user_id: figmaUserId,
      email: figmaUser.email,
      handle: figmaUser.handle,
      avatar_url: figmaUser.img_url,
    });
    if (profileError) throw profileError;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await persistFigmaOAuthTokens({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
    });

    await ensureDefaultColumnSet(userId);
    const session = await createSupabaseSession(figmaUser.email);

    await writeHandoffPayload(writeKey, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: userId,
        handle: figmaUser.handle,
        email: figmaUser.email,
      },
    });

    return NextResponse.redirect(new URL("/login?ok=1", url.origin));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }
}
