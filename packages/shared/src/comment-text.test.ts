import { describe, expect, it } from "vitest";
import { commentMessage, flattenCommentFragments } from "./comment-text";

describe("flattenCommentFragments", () => {
  it("joins text and mentions", () => {
    expect(
      flattenCommentFragments([
        { text: "Hi " },
        { mention: "maya" },
        { text: " please look" },
      ]),
    ).toBe("Hi @maya please look");
  });
});

describe("commentMessage", () => {
  it("accepts a string or fragments", () => {
    expect(commentMessage("plain")).toBe("plain");
    expect(commentMessage([{ text: "a" }])).toBe("a");
    expect(commentMessage(undefined)).toBe("");
  });
});
