import { parseCommentPin } from "./comment-pin";
import { commentMessage } from "./comment-text";
import type { IncomingComment } from "./sync";

export type FigmaApiComment = {
  id: string | number;
  message?: string | { text?: string; mention?: string }[];
  parent_id?: string | number | null;
  resolved_at?: string | null;
  client_meta?: unknown;
};

export function incomingFromFigmaComments(
  comments: FigmaApiComment[],
): IncomingComment[] {
  const replyCount = new Map<string, number>();
  for (const comment of comments) {
    if (!comment.parent_id || comment.parent_id === "0") continue;
    const parentId = String(comment.parent_id);
    replyCount.set(parentId, (replyCount.get(parentId) ?? 0) + 1);
  }

  return comments.map((comment) => {
    const pin = parseCommentPin(comment.client_meta);
    return {
      id: String(comment.id),
      parentId: comment.parent_id ? String(comment.parent_id) : null,
      message: commentMessage(comment.message),
      resolvedAt: comment.resolved_at || null,
      nodeId: pin.nodeId,
      pageId: null,
      pinX: pin.x,
      pinY: pin.y,
      replyCount: replyCount.get(String(comment.id)) ?? 0,
    };
  });
}
