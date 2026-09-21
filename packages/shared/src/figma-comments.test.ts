import { describe, expect, it } from "vitest";
import { incomingFromFigmaComments } from "./figma-comments";

describe("incomingFromFigmaComments", () => {
  it("counts replies on the root and skips using replies as cards later", () => {
    const incoming = incomingFromFigmaComments([
      {
        id: "c1",
        message: "Fix this",
        parent_id: null,
        client_meta: { node_id: "1:2", node_offset: { x: 8, y: 16 } },
      },
      {
        id: "r1",
        message: "ok",
        parent_id: "c1",
      },
    ]);
    expect(incoming[0]).toMatchObject({
      id: "c1",
      parentId: null,
      message: "Fix this",
      nodeId: "1:2",
      pinX: 8,
      pinY: 16,
      replyCount: 1,
    });
    expect(incoming[1]).toMatchObject({
      id: "r1",
      parentId: "c1",
      replyCount: 0,
    });
  });
});
