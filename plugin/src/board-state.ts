import {
  applyCommentSync,
  createDefaultColumns,
  incomingFromFigmaComments,
  leftmost,
  type AppliedCard,
  type Column,
  type FigmaApiComment,
} from "@comment-manager/shared";
import type { BoardCard, BoardPayload } from "./types";

export function newColumnId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyBoard(fileKey: string): BoardPayload {
  return {
    fileKey,
    columns: createDefaultColumns(newColumnId),
    cards: [],
  };
}

function toApplied(card: BoardCard): AppliedCard {
  return {
    id: card.id,
    figmaCommentId: card.figma_comment_id,
    figmaMessage: card.figma_message,
    columnId: card.column_id,
    replyCount: card.reply_count,
    nodeId: card.node_id,
    pageId: card.page_id,
    pinX: card.pin_x,
    pinY: card.pin_y,
    sortRank: card.sort_rank,
  };
}

function fromApplied(card: AppliedCard): BoardCard {
  return {
    id: card.id,
    figma_comment_id: card.figmaCommentId,
    column_id: card.columnId,
    sort_rank: card.sortRank,
    reply_count: card.replyCount,
    figma_message: card.figmaMessage,
    node_id: card.nodeId,
    page_id: card.pageId,
    pin_x: card.pinX,
    pin_y: card.pinY,
  };
}

export function mergeComments(
  board: BoardPayload,
  comments: FigmaApiComment[],
): BoardPayload {
  const columns: Column[] = board.columns;
  const inboxId = leftmost(columns).id;
  const cards = applyCommentSync({
    comments: incomingFromFigmaComments(comments),
    cards: board.cards.map(toApplied),
    leftmostColumnId: inboxId,
  }).map(fromApplied);
  return { ...board, cards };
}

export function moveCard(
  board: BoardPayload,
  cardId: string,
  columnId: string,
): BoardPayload {
  const card = board.cards.find((row) => row.id === cardId);
  if (!card || card.column_id === columnId) return board;
  if (!board.columns.some((column) => column.id === columnId)) return board;
  const nextRank =
    Math.max(
      0,
      ...board.cards
        .filter((row) => row.column_id === columnId)
        .map((row) => row.sort_rank),
    ) + 1;
  return {
    ...board,
    cards: board.cards.map((row) =>
      row.id === cardId
        ? { ...row, column_id: columnId, sort_rank: nextRank }
        : row,
    ),
  };
}

export function isBoardPayload(value: unknown): value is BoardPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as BoardPayload;
  return Array.isArray(row.columns) && Array.isArray(row.cards);
}
