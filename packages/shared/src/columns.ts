export type Column = {
  id: string;
  name: string;
  position: number;
};

export const DEFAULT_COLUMN_NAMES = ["To-do", "In Progress", "Done"] as const;

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
