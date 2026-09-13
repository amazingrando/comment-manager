export type Column = {
  id: string;
  name: string;
  position: number;
};

export const DEFAULT_COLUMN_NAMES = ["To-do", "In Progress", "Done"] as const;

export type EditTarget = "default" | "file";

export type BoardMode = "file-board" | "default-editor";

export function createDefaultColumns(id: () => string): Column[] {
  return DEFAULT_COLUMN_NAMES.map((name, position) => ({
    id: id(),
    name,
    position,
  }));
}

export function sortColumns(columns: Column[]): Column[] {
  return [...columns].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

export function leftmost(columns: Column[]): Column {
  const sorted = sortColumns(columns);
  const first = sorted[0];
  if (!first) {
    throw new Error("A board must have at least one column");
  }
  return first;
}

export function reindex(columns: Column[]): Column[] {
  return columns.map((column, position) => ({ ...column, position }));
}

export function canDeleteColumn(columns: Column[]): boolean {
  return columns.length > 1;
}

export function deleteColumn(
  columns: Column[],
  columnId: string,
): { columns: Column[]; destinationId: string } {
  if (!canDeleteColumn(columns)) {
    throw new Error("Keep at least one column");
  }
  const remaining = columns.filter((column) => column.id !== columnId);
  if (remaining.length === columns.length) {
    throw new Error("Column not found");
  }
  const next = reindex(remaining);
  return { columns: next, destinationId: leftmost(next).id };
}

export function renameColumn(columns: Column[], columnId: string, name: string): Column[] {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Column name is required");
  }
  return columns.map((column) =>
    column.id === columnId ? { ...column, name: trimmed } : column,
  );
}

export function addColumn(
  columns: Column[],
  name: string,
  id: string,
): Column[] {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Column name is required");
  }
  const sorted = sortColumns(columns);
  return reindex([
    ...sorted,
    { id, name: trimmed, position: sorted.length },
  ]);
}

export function reorderColumns(columns: Column[], orderedIds: string[]): Column[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const next: Column[] = [];
  for (const id of orderedIds) {
    const column = byId.get(id);
    if (!column) {
      throw new Error("Column not found");
    }
    next.push(column);
  }
  if (next.length !== columns.length) {
    throw new Error("Reorder must include every column");
  }
  return reindex(next);
}

export function extraNamedColumnsWithCards(input: {
  customColumns: Column[];
  defaultColumns: Column[];
  cardCountByColumnId: Record<string, number>;
}): Column[] {
  const defaultNames = new Set(input.defaultColumns.map((column) => column.name));
  return input.customColumns.filter((column) => {
    if (defaultNames.has(column.name)) return false;
    return (input.cardCountByColumnId[column.id] ?? 0) > 0;
  });
}

export function canResetToDefault(input: {
  customColumns: Column[];
  defaultColumns: Column[];
  cardCountByColumnId: Record<string, number>;
}): { ok: true } | { ok: false; blocking: Column[] } {
  const blocking = extraNamedColumnsWithCards(input);
  if (blocking.length > 0) {
    return { ok: false, blocking };
  }
  return { ok: true };
}

export function remapCardsToDefault<T extends { columnId: string }>(input: {
  cards: T[];
  customColumns: Column[];
  defaultColumns: Column[];
}): T[] {
  const defaultByName = new Map(
    input.defaultColumns.map((column) => [column.name, column.id]),
  );
  const customById = new Map(input.customColumns.map((column) => [column.id, column]));
  const fallback = leftmost(input.defaultColumns).id;
  return input.cards.map((card) => {
    const custom = customById.get(card.columnId);
    const mapped = custom ? defaultByName.get(custom.name) : undefined;
    return { ...card, columnId: mapped ?? fallback };
  });
}

export function boardMode(fileIsCustom: boolean, target: EditTarget): BoardMode {
  if (fileIsCustom && target === "default") return "default-editor";
  return "file-board";
}

export function fileBecomesCustom(target: EditTarget): boolean {
  return target === "file";
}
