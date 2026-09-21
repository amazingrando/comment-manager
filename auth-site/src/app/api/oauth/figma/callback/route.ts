import { NextResponse } from "next/server";
import {
  exchangeFigmaCode,
  fetchFigmaMe,
  readOAuthCookies,
  tokenExpiresAt,
} from "@/lib/figma/oauth";
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

    writeHandoffPayload(writeKey, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? "",
      expires_at: tokenExpiresAt(tokens.expires_in),
      user: {
        id: String(figmaUser.id),
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
