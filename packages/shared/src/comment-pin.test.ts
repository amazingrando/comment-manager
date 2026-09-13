import { describe, expect, it } from "vitest";
import { parseCommentPin } from "./comment-pin";

describe("parseCommentPin", () => {
  it("reads a canvas vector pin", () => {
    expect(parseCommentPin({ x: 120, y: 40 })).toEqual({
      nodeId: null,
      x: 120,
      y: 40,
    });
  });

  it("reads a frame offset pin", () => {
    expect(
      parseCommentPin({
        node_id: "12:8",
        node_offset: { x: 16, y: 24 },
      }),
    ).toEqual({
      nodeId: "12:8",
      x: 16,
      y: 24,
    });
  });

  it("reads a region pin", () => {
    expect(
      parseCommentPin({
        x: 10,
        y: 20,
        region_width: 80,
        region_height: 40,
      }),
    ).toEqual({
      nodeId: null,
      x: 10,
      y: 20,
    });
  });

  it("returns empty for missing metadata", () => {
    expect(parseCommentPin(null)).toEqual({
      nodeId: null,
      x: null,
      y: null,
    });
  });
});
