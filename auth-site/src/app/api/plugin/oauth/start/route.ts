import { emptyCors, jsonWithCors } from "@/lib/plugin/cors";
import { createHandoff, newHandoffKeys } from "@/lib/plugin/handoff";
import { isFigmaOAuthConfigured, serverEnv } from "@/lib/env";

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

  const { readKey, writeKey } = newHandoffKeys();
  createHandoff(readKey, writeKey);
  const { appUrl } = serverEnv();
  const authorizeUrl = `${appUrl}/login?writeKey=${encodeURIComponent(writeKey)}`;
  return jsonWithCors(request, { readKey, authorizeUrl });
}
