import { describe, expect, it } from "vitest";
import {
  addColumn,
  boardMode,
  canDeleteColumn,
  canResetToDefault,
  createDefaultColumns,
  deleteColumn,
  extraNamedColumnsWithCards,
  leftmost,
  remapCardsToDefault,
  renameColumn,
  reorderColumns,
} from "./columns";

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
});

describe("deleteColumn", () => {
  it("moves remaining columns left and reports the new leftmost", () => {
    const columns = createDefaultColumns(ids());
    const todo = columns[0]!;
    const result = deleteColumn(columns, todo.id);
    expect(result.columns.map((column) => column.name)).toEqual([
      "In Progress",
      "Done",
    ]);
    expect(result.destinationId).toBe(result.columns[0]!.id);
    expect(result.columns[0]!.position).toBe(0);
  });

  it("refuses to delete the last column", () => {
    const columns = createDefaultColumns(ids());
    expect(canDeleteColumn(columns)).toBe(true);
    const afterTwo = deleteColumn(
      deleteColumn(columns, columns[0]!.id).columns,
      columns[1]!.id,
    ).columns;
    expect(canDeleteColumn(afterTwo)).toBe(false);
    expect(() => deleteColumn(afterTwo, afterTwo[0]!.id)).toThrow(/at least one/);
  });
});

describe("rename and add", () => {
  it("renames and appends a column", () => {
    let columns = createDefaultColumns(ids());
    columns = renameColumn(columns, columns[0]!.id, " Backlog ");
    columns = addColumn(columns, "Blocked", "col-4");
    expect(columns.map((column) => column.name)).toEqual([
      "Backlog",
      "In Progress",
      "Done",
      "Blocked",
    ]);
  });

  it("reorders by id list", () => {
    const columns = createDefaultColumns(ids());
    const next = reorderColumns(columns, [
      columns[2]!.id,
      columns[0]!.id,
      columns[1]!.id,
    ]);
    expect(next.map((column) => column.name)).toEqual([
      "Done",
      "To-do",
      "In Progress",
    ]);
    expect(leftmost(next).name).toBe("Done");
  });
});

describe("reset to default", () => {
  it("blocks when an extra named column has cards", () => {
    const defaults = createDefaultColumns(ids());
    const custom = addColumn(defaults, "Blocked", "blocked");
    const result = canResetToDefault({
      customColumns: custom,
      defaultColumns: defaults,
      cardCountByColumnId: { blocked: 2 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.blocking.map((column) => column.name)).toEqual(["Blocked"]);
    }
  });

  it("allows reset when extra columns are empty", () => {
    const defaults = createDefaultColumns(ids());
    const custom = addColumn(defaults, "Blocked", "blocked");
    const result = canResetToDefault({
      customColumns: custom,
      defaultColumns: defaults,
      cardCountByColumnId: { blocked: 0, [custom[0]!.id]: 3 },
    });
    expect(result.ok).toBe(true);
  });

  it("maps cards to default columns by name", () => {
    const defaults = createDefaultColumns(ids());
    const custom = addColumn(defaults, "Blocked", "blocked");
    const cards = remapCardsToDefault({
      cards: [
        { id: "a", columnId: custom[0]!.id },
        { id: "b", columnId: "blocked" },
      ],
      customColumns: custom,
      defaultColumns: defaults,
    });
    expect(cards[0]!.columnId).toBe(defaults[0]!.id);
    expect(cards[1]!.columnId).toBe(defaults[0]!.id);
  });

  it("treats ignored cards as cards that block reset", () => {
    const defaults = createDefaultColumns(ids());
    const custom = addColumn(defaults, "Blocked", "blocked");
    expect(
      extraNamedColumnsWithCards({
        customColumns: custom,
        defaultColumns: defaults,
        cardCountByColumnId: { blocked: 1 },
      }),
    ).toHaveLength(1);
  });
});

describe("boardMode", () => {
  it("shows the default editor only on a custom file", () => {
    expect(boardMode(false, "default")).toBe("file-board");
    expect(boardMode(false, "file")).toBe("file-board");
    expect(boardMode(true, "file")).toBe("file-board");
    expect(boardMode(true, "default")).toBe("default-editor");
  });
});
