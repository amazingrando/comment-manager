import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Column } from "@comment-manager/shared";
import { sortColumns } from "@comment-manager/shared";
import type { BoardCard } from "./types";

function DraggableCard({
  card,
  onOpen,
  onIgnore,
  onUnignore,
}: {
  card: BoardCard;
  onOpen: (card: BoardCard) => void;
  onIgnore: (card: BoardCard) => void;
  onUnignore: (card: BoardCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="card"
      {...listeners}
      {...attributes}
    >
      <button className="card-body" type="button" onClick={() => onOpen(card)}>
        {card.figma_message || "(empty comment)"}
      </button>
      {card.ignored_at ? (
        <button type="button" onClick={() => onUnignore(card)}>
          Unhide
        </button>
      ) : (
        <button type="button" onClick={() => onIgnore(card)}>
          Ignore
        </button>
      )}
    </article>
  );
}

function ColumnLane({
  column,
  cards,
  canDelete,
  onRename,
  onDelete,
  onOpen,
  onIgnore,
  onUnignore,
}: {
  column: Column;
  cards: BoardCard[];
  canDelete: boolean;
  onRename: (columnId: string, name: string) => void;
  onDelete: (columnId: string) => void;
  onOpen: (card: BoardCard) => void;
  onIgnore: (card: BoardCard) => void;
  onUnignore: (card: BoardCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [name, setName] = useState(column.name);

  return (
    <section
      ref={setNodeRef}
      className={isOver ? "column over" : "column"}
    >
      <header className="column-head">
        <input
          aria-label="Column name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            const next = name.trim();
            if (!next) {
              setName(column.name);
              return;
            }
            if (next !== column.name) onRename(column.id, next);
          }}
        />
        {canDelete ? (
          <button type="button" onClick={() => onDelete(column.id)}>
            Delete
          </button>
        ) : null}
      </header>
      <div className="column-cards">
        {cards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            onOpen={onOpen}
            onIgnore={onIgnore}
            onUnignore={onUnignore}
          />
        ))}
      </div>
    </section>
  );
}

export function Board({
  columns,
  cards,
  showIgnored,
  onMove,
  onRename,
  onDelete,
  onOpen,
  onIgnore,
  onUnignore,
}: {
  columns: Column[];
  cards: BoardCard[];
  showIgnored: boolean;
  onMove: (cardId: string, columnId: string) => void;
  onRename: (columnId: string, name: string) => void;
  onDelete: (columnId: string) => void;
  onOpen: (card: BoardCard) => void;
  onIgnore: (card: BoardCard) => void;
  onUnignore: (card: BoardCard) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const [error, setError] = useState<string | null>(null);
  const sorted = useMemo(() => sortColumns(columns), [columns]);
  const byColumn = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    for (const column of sorted) map.set(column.id, []);
    for (const card of cards) {
      if (!showIgnored && card.ignored_at) continue;
      const list = map.get(card.column_id);
      if (list) list.push(card);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_rank - b.sort_rank);
    }
    return map;
  }, [cards, showIgnored, sorted]);

  function onDragEnd(event: DragEndEvent) {
    setError(null);
    const overId = event.over?.id;
    if (!overId || typeof event.active.id !== "string") return;
    const columnId = String(overId);
    if (!sorted.some((column) => column.id === columnId)) return;
    onMove(event.active.id, columnId);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {error ? <p className="error">{error}</p> : null}
      <div className="board">
        {sorted.map((column) => (
          <ColumnLane
            key={column.id}
            column={column}
            cards={byColumn.get(column.id) ?? []}
            canDelete={sorted.length > 1}
            onRename={onRename}
            onDelete={onDelete}
            onOpen={onOpen}
            onIgnore={onIgnore}
            onUnignore={onUnignore}
          />
        ))}
      </div>
    </DndContext>
  );
}
