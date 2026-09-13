export type PluginSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; handle: string; email: string };
};

export type MainToUi =
  | {
      type: "init";
      fileKey: string;
      fileName: string;
      session: PluginSession | null;
      pluginId: string;
    }
  | { type: "jump-failed" };

export type UiToMain =
  | { type: "ready" }
  | { type: "store-session"; session: PluginSession }
  | { type: "clear-session" }
  | { type: "jump"; nodeId: string | null };
