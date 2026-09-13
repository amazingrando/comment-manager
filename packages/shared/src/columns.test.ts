import { describe, expect, it } from "vitest";
import { createDefaultColumns, leftmost, sortColumns } from "./columns";

function ids() {
  let n = 0;
  return () => `col-${++n}`;
}

describe("createDefaultColumns", () => {
  it("creates To-do, In Progress, Done", () => {
    const columns = createDefaultColumns(ids());
    expect(columns.map((column) => column.name)).toEqual([
      "To-do",
      "In Progress",
      "Done",
    ]);
    expect(leftmost(columns).name).toBe("To-do");
  });

  it("sorts by position", () => {
    const columns = sortColumns([
      { id: "b", name: "Done", position: 2 },
      { id: "a", name: "To-do", position: 0 },
      { id: "c", name: "In Progress", position: 1 },
    ]);
    expect(columns.map((column) => column.name)).toEqual([
      "To-do",
      "In Progress",
      "Done",
    ]);
  });
});
