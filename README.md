# Comment Manager

Personal Kanban for Figma and FigJam root comments. Figma owns the thread. This plugin owns workflow.

This is a new product. It is not the [figma-triage](https://github.com/amazingrando/figma-triage) website. That repo stays frozen.

## What it does

- Runs as a Figma Community plugin (design files and FigJam).
- Captures **root comments** in the open file when the plugin opens.
- Puts new cards in the **leftmost** column. Default columns: To-do, In Progress, Done.
- The board is **personal**. Two people in the same file have two boards.
- Click a card to jump to the pin.
- Ignore hides a card. A new reply unhides it and leaves it in the same column.
- Drag to Done does **not** resolve the Figma comment (Figma has no official resolve API).
- There is no web board. This auth site is only Sign in with Figma plus API.

## Repo layout

- `plugin/` — Figma plugin (sandbox + UI)
- `auth-site/` — Next.js OAuth callback and comment sync API
- `packages/shared/` — column rules and comment sync plan (tested)
- `supabase/` — schema and RLS

## Local setup

### 1. Env

```bash
cp .env.example .env
cp auth-site/.env.example auth-site/.env.local
```

Generate a token key:

```bash
openssl rand -hex 32
```

Put the same values in `.env` and `auth-site/.env.local`.

### 2. Figma OAuth app

1. Create an app at [Figma developers](https://www.figma.com/developers/apps).
2. Callback URL: `http://localhost:3000/api/oauth/figma/callback`
3. Scopes: `current_user:read`, `file_comments:read`, `file_content:read`, `file_metadata:read`
4. Put the client id and secret in `auth-site/.env.local`.

This is a **new** Figma OAuth app. Do not reuse the figma-triage app.

### 3. Supabase

Docker must be running.

```bash
npm install
npx supabase start
```

Copy the API URL, publishable key, and service_role key into `auth-site/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `TOKEN_ENCRYPTION_KEY`

This is a **new** empty Supabase project. Do not migrate figma-triage data.

### 4. Auth site

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Privacy: [http://localhost:3000/privacy](http://localhost:3000/privacy).

### 5. Plugin

```bash
PLUGIN_AUTH_SITE_URL=http://localhost:3000 \
PLUGIN_SUPABASE_URL=http://127.0.0.1:54321 \
PLUGIN_SUPABASE_ANON_KEY=<publishable-key> \
npm run dev:plugin
```

In Figma: Plugins → Development → Import plugin from manifest → `plugin/manifest.json`.

Save the Figma file so it has a file key, then run Comment Manager.

## Tests

```bash
npm test
npx supabase test db --local
```

## Community listing

The plugin is intended for the public Figma Community. Before submit:

- Replace `plugin/manifest.json` `id` with the id Figma assigns
- Point `networkAccess.allowedDomains` at your hosted auth site and Supabase project
- Host `/privacy` at a public HTTPS URL
- Create a hosted Figma OAuth app (not localhost) and a hosted Supabase project
