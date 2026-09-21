export type IncomingComment = {
  id: string;
  parentId: string | null;
  message: string;
  resolvedAt: string | null;
  nodeId: string | null;
  pageId: string | null;
  pinX: number | null;
  pinY: number | null;
  replyCount: number;
};

export type ExistingCard = {
  id: string;
  figmaCommentId: string;
  figmaMessage: string;
  columnId: string;
  replyCount: number;
  nodeId: string | null;
  pageId: string | null;
  pinX: number | null;
  pinY: number | null;
};

export type SyncInsert = {
  figmaCommentId: string;
  figmaMessage: string;
  columnId: string;
  replyCount: number;
  nodeId: string | null;
  pageId: string | null;
  pinX: number | null;
  pinY: number | null;
};

export type SyncUpdate = {
  id: string;
  figmaMessage: string;
  replyCount: number;
  nodeId: string | null;
  pageId: string | null;
  pinX: number | null;
  pinY: number | null;
};

export type SyncPlan = {
  insert: SyncInsert[];
  update: SyncUpdate[];
};

export type AppliedCard = ExistingCard & { sortRank: number };

export function planCommentSync(input: {
  comments: IncomingComment[];
  cards: ExistingCard[];
  leftmostColumnId: string;
}): SyncPlan {
  const cardsByComment = new Map(
    input.cards.map((card) => [card.figmaCommentId, card]),
  );
  const roots = input.comments.filter(
    (comment) =>
      comment.parentId == null ||
      comment.parentId === "" ||
      comment.parentId === "0",
  );
  const insert: SyncInsert[] = [];
  const update: SyncUpdate[] = [];

  for (const root of roots) {
    const existing = cardsByComment.get(root.id);
    if (!existing) {
      if (root.resolvedAt) continue;
      insert.push({
        figmaCommentId: root.id,
        figmaMessage: root.message,
        columnId: input.leftmostColumnId,
        replyCount: root.replyCount,
        nodeId: root.nodeId,
        pageId: root.pageId,
        pinX: root.pinX,
        pinY: root.pinY,
      });
      continue;
    }

    update.push({
      id: existing.id,
      figmaMessage: root.message,
      replyCount: root.replyCount,
      nodeId: root.nodeId,
      pageId: root.pageId,
      pinX: root.pinX,
      pinY: root.pinY,
    });
  }

  return { insert, update };
}

export function applyCommentSync(input: {
  comments: IncomingComment[];
  cards: AppliedCard[];
  leftmostColumnId: string;
}): AppliedCard[] {
  const plan = planCommentSync({
    comments: input.comments,
    cards: input.cards,
    leftmostColumnId: input.leftmostColumnId,
  });

  const next = new Map(input.cards.map((card) => [card.id, { ...card }]));
  const ranks = new Map<string, number>();
  for (const card of input.cards) {
    ranks.set(
      card.columnId,
      Math.max(ranks.get(card.columnId) ?? 0, card.sortRank),
    );
  }

  for (const row of plan.insert) {
    const nextRank = (ranks.get(row.columnId) ?? 0) + 1;
    ranks.set(row.columnId, nextRank);
    const id = row.figmaCommentId;
    next.set(id, {
      id,
      figmaCommentId: row.figmaCommentId,
      figmaMessage: row.figmaMessage,
      columnId: row.columnId,
      replyCount: row.replyCount,
      nodeId: row.nodeId,
      pageId: row.pageId,
      pinX: row.pinX,
      pinY: row.pinY,
      sortRank: nextRank,
    });
  }

  for (const row of plan.update) {
    const existing = next.get(row.id);
    if (!existing) continue;
    next.set(row.id, {
      ...existing,
      figmaMessage: row.figmaMessage,
      replyCount: row.replyCount,
      nodeId: row.nodeId,
      pageId: row.pageId,
      pinX: row.pinX,
      pinY: row.pinY,
    });
  }

  return [...next.values()];
}
