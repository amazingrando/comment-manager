import { describe, expect, it } from "vitest";
import { planCommentSync, type ExistingCard, type IncomingComment } from "./sync";

const left = "col-todo";

function root(
  overrides: Partial<IncomingComment> & Pick<IncomingComment, "id">,
): IncomingComment {
  return {
    parentId: null,
    message: "Fix this",
    resolvedAt: null,
    nodeId: "1:2",
    pageId: "0:1",
    replyCount: 0,
    ...overrides,
  };
}

function card(
  overrides: Partial<ExistingCard> & Pick<ExistingCard, "id" | "figmaCommentId">,
): ExistingCard {
  return {
    figmaMessage: "Fix this",
    columnId: "col-doing",
    ignoredAt: null,
    replyCount: 0,
    nodeId: "1:2",
    pageId: "0:1",
    ...overrides,
  };
}

describe("planCommentSync", () => {
  it("inserts unresolved new roots into the leftmost column", () => {
    const plan = planCommentSync({
      comments: [root({ id: "c1" })],
      cards: [],
      leftmostColumnId: left,
    });
    expect(plan.insert).toEqual([
      {
        figmaCommentId: "c1",
        figmaMessage: "Fix this",
        columnId: left,
        replyCount: 0,
        nodeId: "1:2",
        pageId: "0:1",
      },
    ]);
    expect(plan.update).toEqual([]);
  });

  it("skips already-resolved roots that have no card", () => {
    const plan = planCommentSync({
      comments: [root({ id: "c1", resolvedAt: "2026-01-01T00:00:00.000Z" })],
      cards: [],
      leftmostColumnId: left,
    });
    expect(plan.insert).toEqual([]);
  });

  it("treats an empty parent id as a root comment", () => {
    const plan = planCommentSync({
      comments: [root({ id: "c1", parentId: "" })],
      cards: [],
      leftmostColumnId: left,
    });
    expect(plan.insert.map((row) => row.figmaCommentId)).toEqual(["c1"]);
  });

  it("does not insert replies as cards", () => {
    const plan = planCommentSync({
      comments: [
        root({ id: "c1" }),
        {
          id: "r1",
          parentId: "c1",
          message: "ok",
          resolvedAt: null,
          nodeId: null,
          pageId: null,
          replyCount: 0,
        },
      ],
      cards: [],
      leftmostColumnId: left,
    });
    expect(plan.insert.map((row) => row.figmaCommentId)).toEqual(["c1"]);
  });

  it("updates root text and does not move the column", () => {
    const plan = planCommentSync({
      comments: [root({ id: "c1", message: "Edited" })],
      cards: [card({ id: "card-1", figmaCommentId: "c1" })],
      leftmostColumnId: left,
    });
    expect(plan.insert).toEqual([]);
    expect(plan.update[0]).toMatchObject({
      id: "card-1",
      figmaMessage: "Edited",
    });
  });

  it("leaves a later-resolved card in place", () => {
    const plan = planCommentSync({
      comments: [root({ id: "c1", resolvedAt: "2026-01-02T00:00:00.000Z" })],
      cards: [card({ id: "card-1", figmaCommentId: "c1", columnId: "col-doing" })],
      leftmostColumnId: left,
    });
    expect(plan.insert).toEqual([]);
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0]!.id).toBe("card-1");
  });

  it("unhides an ignored card when a new reply arrives", () => {
    const plan = planCommentSync({
      comments: [root({ id: "c1", replyCount: 2 })],
      cards: [
        card({
          id: "card-1",
          figmaCommentId: "c1",
          ignoredAt: "2026-01-01T00:00:00.000Z",
          replyCount: 1,
        }),
      ],
      leftmostColumnId: left,
    });
    expect(plan.update[0]!.ignoredAt).toBeNull();
    expect(plan.update[0]!.replyCount).toBe(2);
  });

  it("keeps ignore when reply count is unchanged", () => {
    const plan = planCommentSync({
      comments: [root({ id: "c1", replyCount: 1 })],
      cards: [
        card({
          id: "card-1",
          figmaCommentId: "c1",
          ignoredAt: "2026-01-01T00:00:00.000Z",
          replyCount: 1,
        }),
      ],
      leftmostColumnId: left,
    });
    expect(plan.update[0]!.ignoredAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("does not drop a card whose comment disappeared", () => {
    const plan = planCommentSync({
      comments: [],
      cards: [card({ id: "card-1", figmaCommentId: "gone" })],
      leftmostColumnId: left,
    });
    expect(plan.update).toEqual([]);
    expect(plan.insert).toEqual([]);
  });
});
