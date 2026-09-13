import { NextResponse } from "next/server";
import { isFigmaOAuthConfigured } from "@/lib/env";
import { createOAuthState, figmaAuthorizeUrl } from "@/lib/figma/oauth";

export async function GET(request: Request) {
  if (!isFigmaOAuthConfigured()) {
    return NextResponse.json(
      { error: "Figma OAuth is not configured" },
      { status: 500 },
    );
  }

  const writeKey = new URL(request.url).searchParams.get("writeKey");
  if (!writeKey) {
    return NextResponse.json({ error: "writeKey is required" }, { status: 400 });
  }

  const state = await createOAuthState(writeKey);
  return NextResponse.redirect(figmaAuthorizeUrl(state));
}
