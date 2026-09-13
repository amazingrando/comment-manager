import { emptyCors, jsonWithCors } from "@/lib/plugin/cors";
import { userFromBearer } from "@/lib/plugin/bearer";
import { listFileComments } from "@/lib/figma/api";
import { getValidFigmaAccessToken } from "@/lib/figma/tokens";

export async function OPTIONS(request: Request) {
  return emptyCors(request);
}

export async function POST(request: Request) {
  const auth = await userFromBearer(request);
  if (!auth) {
    return jsonWithCors(request, { error: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    fileKey?: string;
  } | null;
  const fileKey = body?.fileKey?.trim();
  if (!fileKey) {
    return jsonWithCors(request, { error: "fileKey is required" }, { status: 400 });
  }

  try {
    const accessToken = await getValidFigmaAccessToken(auth.userId);
    const comments = await listFileComments(accessToken, fileKey);
    return jsonWithCors(request, { comments });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Could not load comments";
    return jsonWithCors(request, { error: message }, { status: 500 });
  }
}
