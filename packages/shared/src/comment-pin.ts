export type CommentPin = {
  nodeId: string | null;
  x: number | null;
  y: number | null;
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNodeId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function parseCommentPin(meta: unknown): CommentPin {
  if (!meta || typeof meta !== "object") {
    return { nodeId: null, x: null, y: null };
  }
  const record = meta as Record<string, unknown>;
  const nodeId = asNodeId(record.node_id);
  const offset =
    record.node_offset && typeof record.node_offset === "object"
      ? (record.node_offset as Record<string, unknown>)
      : null;
  const offsetX = offset ? asNumber(offset.x) : null;
  const offsetY = offset ? asNumber(offset.y) : null;
  const x = asNumber(record.x) ?? offsetX;
  const y = asNumber(record.y) ?? offsetY;
  return { nodeId, x, y };
}
