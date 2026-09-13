import * as esbuild from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const authSiteUrl = process.env.PLUGIN_AUTH_SITE_URL || "http://localhost:3000";
const supabaseUrl =
  process.env.PLUGIN_SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = process.env.PLUGIN_SUPABASE_ANON_KEY || "";
const pluginId = process.env.PLUGIN_ID || "comment-manager";

if (!supabaseAnonKey) {
  throw new Error(
    "PLUGIN_SUPABASE_ANON_KEY is missing. Put the publishable key in plugin/.env and restart npm run dev:plugin.",
  );
}

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
  minify: true,
  outfile: path.join(root, "dist/code.js"),
  target: "es2017",
  format: "iife",
  define,
};

const ui = {
  entryPoints: [path.join(root, "src/ui.tsx")],
  bundle: true,
  minify: true,
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
