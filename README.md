# Comment Manager

Personal Kanban for Figma and FigJam root comments. Figma owns the thread. This plugin owns workflow.

This is a new product. It is not the [figma-triage](https://github.com/amazingrando/figma-triage) website. That repo stays frozen.

## What it does

- Runs as a Figma Community plugin (design files and FigJam).
- Captures **root comments** in the open file when the plugin opens, on Refresh, and every 5 seconds while the plugin stays open.
- Puts new cards in **To-do**. Lanes are fixed: To-do, In Progress, Done.
- The board is **personal**. Two people in the same file have two boards.
- Click a card to jump to the pin.
- Drag to Done does **not** resolve the Figma comment (Figma has no official resolve API).
- There is no web board. The auth site is only Sign in with Figma. The plugin stores the board and token in Figma `clientStorage`.

## Repo layout

- `plugin/` — Figma plugin (sandbox + UI). Reads comments and stores the board.
- `auth-site/` — Next.js OAuth callback, plugin handoff, and token refresh
- `packages/shared/` — column rules and comment sync plan (tested)

## Local setup

### 1. Env

```bash
cp .env.example .env
cp auth-site/.env.example auth-site/.env.local
cp plugin/.env.example plugin/.env
```

### 2. Figma OAuth app

1. Create an app at [Figma developers](https://www.figma.com/developers/apps).
2. Callback URL: `http://localhost:3000/api/oauth/figma/callback`
3. Scopes: `current_user:read`, `file_comments:read`, `file_content:read`, `file_metadata:read`
4. Put the client id and secret in `auth-site/.env.local`.

This is a **new** Figma OAuth app. Do not reuse the figma-triage app.

### 3. Auth site

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Privacy: [http://localhost:3000/privacy](http://localhost:3000/privacy).

Run this as a single Node process (`next dev` or `next start`). OAuth handoffs live in memory for 10 minutes so the plugin can pick up the token. Serverless hosts can drop a handoff between start and poll.

### 4. Plugin

```bash
PLUGIN_AUTH_SITE_URL=http://localhost:3000 npm run dev:plugin
```

In Figma: Plugins → Development → Import plugin from manifest → `plugin/manifest.json`.

The local manifest sets `enablePrivatePluginApi` so `figma.fileKey` is available in development. Save the Figma file so it has a file key, then run Comment Manager.

## Tests

```bash
npm test
```

## Community listing

The plugin is intended for the public Figma Community. Before submit:

- Replace `plugin/manifest.json` `id` with the id Figma assigns
- Point `networkAccess.allowedDomains` at your hosted auth site
- Host `/privacy` at a public HTTPS URL
- Create a hosted Figma OAuth app (not localhost)
