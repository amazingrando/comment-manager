/// <reference types="@figma/plugin-typings" />

import type { MainToUi, PluginSession, UiToMain } from "./messages";

const SESSION_KEY = "session";

figma.showUI(__html__, { width: 760, height: 520, themeColors: true });

figma.ui.onmessage = async (msg: UiToMain) => {
  if (msg.type === "ready") {
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
    return;
  }

  if (msg.type === "store-session") {
    await figma.clientStorage.setAsync(SESSION_KEY, msg.session);
    return;
  }

  if (msg.type === "clear-session") {
    await figma.clientStorage.deleteAsync(SESSION_KEY);
    return;
  }

  if (msg.type === "jump") {
    if (!msg.nodeId) {
      figma.notify("This comment has no pin on the canvas.");
      figma.ui.postMessage({ type: "jump-failed" } satisfies MainToUi);
      return;
    }
    await figma.loadAllPagesAsync();
    const node = await figma.getNodeByIdAsync(msg.nodeId);
    if (!node) {
      figma.notify("The pin is gone. The comment may be deleted.");
      figma.ui.postMessage({ type: "jump-failed" } satisfies MainToUi);
      return;
    }
    let current: BaseNode | null = node;
    while (current && current.type !== "PAGE") {
      current = current.parent;
    }
    if (current && current.type === "PAGE") {
      figma.currentPage = current;
    }
    if ("absoluteTransform" in node) {
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
  }
};
