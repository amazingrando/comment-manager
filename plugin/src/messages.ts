export type PluginUser = { id: string; handle: string; email: string };

export type PluginSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: PluginUser;
};

export type BoardCard = {
  id: string;
  figma_comment_id: string;
  column_id: string;
  sort_rank: number;
  reply_count: number;
  figma_message: string;
  node_id: string | null;
  page_id: string | null;
  pin_x: number | null;
  pin_y: number | null;
};

export type BoardPayload = {
  fileKey: string;
  columns: { id: string; name: string; position: number }[];
  cards: BoardCard[];
};

export type MainToUi =
  | {
      type: "init";
      fileKey: string;
      fileName: string;
      user: PluginUser | null;
      board: BoardPayload | null;
    }
  | { type: "board"; board: BoardPayload }
  | { type: "signed-out" }
  | { type: "error"; message: string };

export type UiToMain =
  | { type: "ready" }
  | { type: "store-session"; session: PluginSession }
  | { type: "clear-session" }
  | { type: "sync" }
  | { type: "move-card"; cardId: string; columnId: string }
  | {
      type: "jump";
      nodeId: string | null;
      x: number | null;
      y: number | null;
    };
