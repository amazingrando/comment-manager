import { emptyCors, jsonWithCors } from "@/lib/plugin/cors";
import { readHandoff } from "@/lib/plugin/handoff";

export async function OPTIONS(request: Request) {
  return emptyCors(request);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const readKey = url.searchParams.get("readKey");
  if (!readKey) {
    return jsonWithCors(request, { error: "readKey is required" }, { status: 400 });
  }

  const result = await readHandoff(readKey);
  if (result.status === "pending") {
    return jsonWithCors(request, { status: "pending" }, { status: 202 });
  }
  if (result.status === "missing" || result.status === "expired") {
    return jsonWithCors(request, { error: "Handoff expired" }, { status: 410 });
  }
  return jsonWithCors(request, { status: "ready", session: result.payload });
}
