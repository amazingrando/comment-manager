import { emptyCors, jsonWithCors } from "@/lib/plugin/cors";
import { userFromBearer } from "@/lib/plugin/bearer";
import { syncFileBoard } from "@/lib/plugin/sync-board";

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
    const board = await syncFileBoard({ userId: auth.userId, fileKey });
    return jsonWithCors(request, board);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return jsonWithCors(request, { error: message }, { status: 500 });
  }
}
