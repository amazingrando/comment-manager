/// <reference types="@figma/plugin-typings" />

import type { MainToUi, PluginSession, UiToMain } from "./messages";

const SESSION_KEY = "session";

try {
  figma.showUI(__html__, {
    width: 760,
    height: 520,
    themeColors: true,
    title: "Comment Manager",
  });
} catch (error) {
  figma.notify(
    `Comment Manager failed to open: ${error instanceof Error ? error.message : "unknown error"}`,
    { error: true },
  );
  figma.closePlugin();
}

figma.ui.onmessage = (raw: UiToMain | { pluginMessage?: UiToMain }) => {
  const msg =
    raw && typeof raw === "object" && "pluginMessage" in raw
      ? raw.pluginMessage
      : raw;
  if (!msg || typeof msg !== "object" || !("type" in msg)) return;

  if (msg.type === "ready") {
    void sendInit();
    return;
  }

  if (msg.type === "store-session") {
    void figma.clientStorage.setAsync(SESSION_KEY, msg.session);
    return;
  }

  if (msg.type === "clear-session") {
    void figma.clientStorage.deleteAsync(SESSION_KEY);
    return;
  }

  if (msg.type === "jump") {
    void openCommentPin(msg.nodeId, msg.x, msg.y);
  }
};

async function sendInit() {
  const session = (await figma.clientStorage.getAsync(SESSION_KEY)) as
    | PluginSession
    | undefined;
  figma.ui.postMessage({
    type: "init",
    fileKey: figma.fileKey ?? "",
    fileName: figma.root.name,
    session: session ?? null,
    pluginId: __PLUGIN_ID__,
  } satisfies MainToUi);
}

async function openCommentPin(
  nodeId: string | null,
  x: number | null,
  y: number | null,
) {
  try {
    const jumped = await jumpToComment(nodeId, x, y);
    if (!jumped) {
      figma.notify("Could not find that comment on the canvas.");
    }
  } catch (error) {
    figma.notify(
      error instanceof Error ? error.message : "Could not jump to the comment.",
      { error: true },
    );
  }
}

async function getNode(id: string): Promise<BaseNode | null> {
  return (
    (await figma.getNodeByIdAsync(id)) ??
    (await figma.getNodeByIdAsync(id.replace(/-/g, ":"))) ??
    (await figma.getNodeByIdAsync(id.replace(/:/g, "-")))
  );
}

async function switchToPage(node: BaseNode) {
  let current: BaseNode | null = node;
  while (current && current.type !== "PAGE") {
    current = current.parent;
  }
  if (!current || current.type !== "PAGE") return;
  const api = figma as PluginAPI & {
    setCurrentPageAsync?: (page: PageNode) => Promise<void>;
  };
  if (api.setCurrentPageAsync) {
    await api.setCurrentPageAsync(current);
    return;
  }
  figma.currentPage = current;
}

function showPin(x: number, y: number) {
  figma.viewport.zoom = 1;
  const { width } = figma.viewport.bounds;
  figma.viewport.center = {
    x: x + width * 0.22,
    y,
  };
}

async function jumpToComment(
  nodeId: string | null,
  x: number | null,
  y: number | null,
): Promise<boolean> {
  if (nodeId) {
    let node = await getNode(nodeId);
    if (!node) {
      await figma.loadAllPagesAsync();
      node = await getNode(nodeId);
    }
    if (node) {
      await switchToPage(node);
      if (node.type === "PAGE" || node.type === "DOCUMENT") {
        if (x != null && y != null) {
          showPin(x, y);
          return true;
        }
        return false;
      }
      if ("absoluteTransform" in node) {
        const scene = node as SceneNode;
        if (x != null && y != null) {
          showPin(
            scene.absoluteTransform[0][2] + x,
            scene.absoluteTransform[1][2] + y,
          );
        } else {
          figma.viewport.scrollAndZoomIntoView([scene]);
        }
        return true;
      }
    }
  }

  if (x != null && y != null) {
    showPin(x, y);
    return true;
  }

  return false;
}
