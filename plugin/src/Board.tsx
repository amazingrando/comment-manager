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
import { leftmost, sortColumns } from "@comment-manager/shared";
import type { BoardCard } from "./types";

function DraggableCard({
  card,
  onOpen,
}: {
  card: BoardCard;
  onOpen: (card: BoardCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <article ref={setNodeRef} style={style} className="card">
      <button
        className="card-body"
        type="button"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          onOpen(card);
        }}
      >
        {card.figma_message || "(empty comment)"}
      </button>
      <button
        className="card-drag"
        type="button"
        aria-label="Move card"
        {...listeners}
        {...attributes}
      >
        ⋮⋮
      </button>
    </article>
  );
}

function ColumnLane({
  column,
  cards,
  onOpen,
}: {
  column: Column;
  cards: BoardCard[];
  onOpen: (card: BoardCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={isOver ? "column over" : "column"}
    >
      <header className="column-head">
        <h2>{column.name}</h2>
      </header>
      <div className="column-cards">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

export function Board({
  columns,
  cards,
  onMove,
  onOpen,
}: {
  columns: Column[];
  cards: BoardCard[];
  onMove: (cardId: string, columnId: string) => void;
  onOpen: (card: BoardCard) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [error, setError] = useState<string | null>(null);
  const sorted = useMemo(() => sortColumns(columns), [columns]);
  const inboxId = sorted[0] ? leftmost(sorted).id : "";
  const byColumn = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    for (const column of sorted) map.set(column.id, []);
    for (const card of cards) {
      const list = map.get(card.column_id) ?? map.get(inboxId);
      if (list) list.push(card);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_rank - b.sort_rank);
    }
    return map;
  }, [cards, inboxId, sorted]);

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
            onOpen={onOpen}
          />
        ))}
      </div>
    </DndContext>
  );
}
