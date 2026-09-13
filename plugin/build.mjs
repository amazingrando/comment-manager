import * as esbuild from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

const authSiteUrl = process.env.PLUGIN_AUTH_SITE_URL || "http://localhost:3000";
const supabaseUrl =
  process.env.PLUGIN_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey = process.env.PLUGIN_SUPABASE_ANON_KEY || "";
const pluginId = process.env.PLUGIN_ID || "comment-manager";

const define = {
  __AUTH_SITE_URL__: JSON.stringify(authSiteUrl),
  __SUPABASE_URL__: JSON.stringify(supabaseUrl),
  __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
  __PLUGIN_ID__: JSON.stringify(pluginId),
};

await mkdir(path.join(root, "dist"), { recursive: true });

const main = {
  entryPoints: [path.join(root, "src/main.ts")],
  bundle: true,
  outfile: path.join(root, "dist/code.js"),
  target: "es2017",
  format: "iife",
  define,
};

const ui = {
  entryPoints: [path.join(root, "src/ui.tsx")],
  bundle: true,
  outfile: path.join(root, "dist/ui.js"),
  target: "es2017",
  format: "iife",
  define,
  jsx: "automatic",
};

async function writeHtml() {
  const js = await readFile(path.join(root, "dist/ui.js"), "utf8");
  const css = await readFile(path.join(root, "src/ui.css"), "utf8");
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body, #root { height: 100%; margin: 0; }
      body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: var(--figma-color-bg, #fff); color: var(--figma-color-text, #111); }
      ${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>${js}</script>
  </body>
</html>
`;
  await writeFile(path.join(root, "dist/ui.html"), html);
}

if (watch) {
  const mainCtx = await esbuild.context(main);
  const uiCtx = await esbuild.context({
    ...ui,
    plugins: [
      {
        name: "html",
        setup(build) {
          build.onEnd(async () => {
            await writeHtml();
          });
        },
      },
    ],
  });
  await mainCtx.watch();
  await uiCtx.watch();
  console.log("Watching plugin…");
} else {
  await esbuild.build(main);
  await esbuild.build(ui);
  await writeHtml();
}
