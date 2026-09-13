export type IncomingComment = {
  id: string;
  parentId: string | null;
  message: string;
  resolvedAt: string | null;
  nodeId: string | null;
  pageId: string | null;
  replyCount: number;
};

export type ExistingCard = {
  id: string;
  figmaCommentId: string;
  figmaMessage: string;
  columnId: string;
  ignoredAt: string | null;
  replyCount: number;
  nodeId: string | null;
  pageId: string | null;
};

export type SyncInsert = {
  figmaCommentId: string;
  figmaMessage: string;
  columnId: string;
  replyCount: number;
  nodeId: string | null;
  pageId: string | null;
};

export type SyncUpdate = {
  id: string;
  figmaMessage: string;
  replyCount: number;
  ignoredAt: string | null;
  nodeId: string | null;
  pageId: string | null;
};

export type SyncPlan = {
  insert: SyncInsert[];
  update: SyncUpdate[];
};

export function planCommentSync(input: {
  comments: IncomingComment[];
  cards: ExistingCard[];
  leftmostColumnId: string;
}): SyncPlan {
  const cardsByComment = new Map(
    input.cards.map((card) => [card.figmaCommentId, card]),
  );
  const roots = input.comments.filter((comment) => comment.parentId == null);
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
      });
      continue;
    }

    const hasNewReply = root.replyCount > existing.replyCount;
    const ignoredAt =
      existing.ignoredAt && hasNewReply ? null : existing.ignoredAt;

    update.push({
      id: existing.id,
      figmaMessage: root.message,
      replyCount: root.replyCount,
      ignoredAt,
      nodeId: root.nodeId,
      pageId: root.pageId,
    });
  }

  return { insert, update };
}
