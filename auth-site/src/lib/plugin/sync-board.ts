import {
  leftmost,
  planCommentSync,
  type Column,
  type ExistingCard,
  type IncomingComment,
} from "@comment-manager/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { commentNodeId, listFileComments, rootMessage } from "@/lib/figma/api";
import { getValidFigmaAccessToken } from "@/lib/figma/tokens";
import { ensureDefaultColumnSet, parseColumns } from "@/lib/auth/figma-user";
import type { Card } from "@/lib/database.types";

function toIncoming(comments: Awaited<ReturnType<typeof listFileComments>>): IncomingComment[] {
  const replyCount = new Map<string, number>();
  for (const comment of comments) {
    if (!comment.parent_id) continue;
    replyCount.set(comment.parent_id, (replyCount.get(comment.parent_id) ?? 0) + 1);
  }

  return comments.map((comment) => ({
    id: comment.id,
    parentId: comment.parent_id ?? null,
    message: rootMessage(comment),
    resolvedAt: comment.resolved_at ?? null,
    nodeId: commentNodeId(comment),
    pageId: null,
    replyCount: replyCount.get(comment.id) ?? 0,
  }));
}

function toExisting(cards: Card[]): ExistingCard[] {
  return cards.map((card) => ({
    id: card.id,
    figmaCommentId: card.figma_comment_id,
    figmaMessage: card.figma_message,
    columnId: card.column_id,
    ignoredAt: card.ignored_at,
    replyCount: card.reply_count,
    nodeId: card.node_id,
    pageId: card.page_id,
  }));
}

export async function syncFileBoard(input: {
  userId: string;
  fileKey: string;
}) {
  const admin = createAdminClient();
  const accessToken = await getValidFigmaAccessToken(input.userId);
  const comments = await listFileComments(accessToken, input.fileKey);
  const defaultColumns = await ensureDefaultColumnSet(input.userId);

  const { data: fileSet } = await admin
    .from("column_sets")
    .select("columns")
    .eq("user_id", input.userId)
    .eq("file_key", input.fileKey)
    .maybeSingle();

  const fileIsCustom = Boolean(fileSet);
  const columns: Column[] = fileSet
    ? parseColumns(fileSet.columns)
    : defaultColumns;
  const inboxId = leftmost(columns).id;

  const { data: cardRows, error: cardError } = await admin
    .from("cards")
    .select("*")
    .eq("user_id", input.userId)
    .eq("file_key", input.fileKey);
  if (cardError) throw cardError;

  const cards = (cardRows ?? []) as Card[];
  const plan = planCommentSync({
    comments: toIncoming(comments),
    cards: toExisting(cards),
    leftmostColumnId: inboxId,
  });

  const now = new Date().toISOString();
  const ranks = new Map<string, number>();
  for (const card of cards) {
    const current = ranks.get(card.column_id) ?? 0;
    ranks.set(card.column_id, Math.max(current, card.sort_rank));
  }

  for (const row of plan.insert) {
    const nextRank = (ranks.get(row.columnId) ?? 0) + 1;
    ranks.set(row.columnId, nextRank);
    const { error } = await admin.from("cards").insert({
      user_id: input.userId,
      file_key: input.fileKey,
      figma_comment_id: row.figmaCommentId,
      column_id: row.columnId,
      sort_rank: nextRank,
      figma_message: row.figmaMessage,
      reply_count: row.replyCount,
      node_id: row.nodeId,
      page_id: row.pageId,
    });
    if (error) throw error;
  }

  for (const row of plan.update) {
    const { error } = await admin
      .from("cards")
      .update({
        figma_message: row.figmaMessage,
        reply_count: row.replyCount,
        ignored_at: row.ignoredAt,
        node_id: row.nodeId,
        page_id: row.pageId,
        updated_at: now,
      })
      .eq("id", row.id)
      .eq("user_id", input.userId);
    if (error) throw error;
  }

  const { data: nextCards, error: reloadError } = await admin
    .from("cards")
    .select("*")
    .eq("user_id", input.userId)
    .eq("file_key", input.fileKey)
    .order("sort_rank", { ascending: true });
  if (reloadError) throw reloadError;

  return {
    fileKey: input.fileKey,
    fileIsCustom,
    columns,
    defaultColumns,
    cards: (nextCards ?? []) as Card[],
  };
}
