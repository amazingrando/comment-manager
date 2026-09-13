export type BoardCard = {
  id: string;
  user_id: string;
  file_key: string;
  figma_comment_id: string;
  column_id: string;
  sort_rank: number;
  reply_count: number;
  figma_message: string;
  node_id: string | null;
  page_id: string | null;
};

export type BoardPayload = {
  fileKey: string;
  columns: { id: string; name: string; position: number }[];
  cards: BoardCard[];
};

export type { PluginSession } from "./messages";
