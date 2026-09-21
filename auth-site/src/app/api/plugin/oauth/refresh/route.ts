import { z } from "zod";
import { emptyCors, jsonWithCors } from "@/lib/plugin/cors";
import { isFigmaOAuthConfigured } from "@/lib/env";
import { refreshFigmaToken, tokenExpiresAt } from "@/lib/figma/oauth";

const bodySchema = z.object({
  refresh_token: z.string().min(1),
});

export async function OPTIONS(request: Request) {
  return emptyCors(request);
}

export async function POST(request: Request) {
  if (!isFigmaOAuthConfigured()) {
    return jsonWithCors(
      request,
      { error: "Figma OAuth is not configured" },
      { status: 500 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonWithCors(
      request,
      { error: "refresh_token is required" },
      { status: 400 },
    );
  }

  try {
    const tokens = await refreshFigmaToken(parsed.data.refresh_token);
    return jsonWithCors(request, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? parsed.data.refresh_token,
      expires_at: tokenExpiresAt(tokens.expires_in),
    });
  } catch (error) {
    console.error(error);
    return jsonWithCors(
      request,
      { error: "Could not refresh Figma sign in" },
      { status: 401 },
    );
  }
}
