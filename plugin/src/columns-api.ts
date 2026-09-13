import type { Column } from "@comment-manager/shared";
import {
  addColumn,
  canResetToDefault,
  deleteColumn,
  remapCardsToDefault,
  renameColumn,
} from "@comment-manager/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardCard } from "./types";

export async function saveColumnSet(
  supabase: SupabaseClient,
  input: {
    userId: string;
    fileKey: string | null;
    columns: Column[];
  },
) {
  const query = supabase.from("column_sets").select("id").eq("user_id", input.userId);
  const existing = input.fileKey
    ? await query.eq("file_key", input.fileKey).maybeSingle()
    : await query.is("file_key", null).maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data?.id) {
    const { error } = await supabase
      .from("column_sets")
      .update({
        columns: input.columns,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("column_sets").insert({
    user_id: input.userId,
    file_key: input.fileKey,
    columns: input.columns,
  });
  if (error) throw error;
}

export async function applyDeleteColumn(
  supabase: SupabaseClient,
  input: {
    userId: string;
    fileKey: string | null;
    columns: Column[];
    columnId: string;
    cards: BoardCard[];
  },
) {
  const result = deleteColumn(input.columns, input.columnId);
  const affected = input.cards.filter((card) => card.column_id === input.columnId);
  for (const card of affected) {
    const { error } = await supabase
      .from("cards")
      .update({
        column_id: result.destinationId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("user_id", input.userId);
    if (error) throw error;
  }
  await saveColumnSet(supabase, {
    userId: input.userId,
    fileKey: input.fileKey,
    columns: result.columns,
  });
  return {
    columns: result.columns,
    destinationId: result.destinationId,
  };
}

export async function applyReset(
  supabase: SupabaseClient,
  input: {
    userId: string;
    fileKey: string;
    customColumns: Column[];
    defaultColumns: Column[];
    cards: BoardCard[];
  },
) {
  const counts: Record<string, number> = {};
  for (const card of input.cards) {
    counts[card.column_id] = (counts[card.column_id] ?? 0) + 1;
  }
  const allowed = canResetToDefault({
    customColumns: input.customColumns,
    defaultColumns: input.defaultColumns,
    cardCountByColumnId: counts,
  });
  if (!allowed.ok) {
    throw new Error(
      `Move or delete cards in ${allowed.blocking.map((c) => c.name).join(", ")} before reset.`,
    );
  }

  const remapped = remapCardsToDefault({
    cards: input.cards.map((card) => ({
      id: card.id,
      columnId: card.column_id,
    })),
    customColumns: input.customColumns,
    defaultColumns: input.defaultColumns,
  });

  for (const card of remapped) {
    const { error } = await supabase
      .from("cards")
      .update({
        column_id: card.columnId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("user_id", input.userId);
    if (error) throw error;
  }

  const { error } = await supabase
    .from("column_sets")
    .delete()
    .eq("user_id", input.userId)
    .eq("file_key", input.fileKey);
  if (error) throw error;
}

export { addColumn, renameColumn };
