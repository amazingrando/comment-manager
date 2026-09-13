-- Comment Manager v1
-- Tokens live in `private` (not exposed via the Data API).
-- Do not use auth.jwt() user_metadata for access control.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  figma_user_id text not null unique,
  email text not null,
  handle text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Token and OAuth handoff tables are in public so the Data API can reach them,
-- but anon/authenticated have no GRANT. Service role only.
create table public.figma_user_tokens (
  user_id uuid primary key references public.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.plugin_oauth_handoffs (
  read_key text primary key,
  write_key_hash text not null unique,
  payload jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.figma_user_tokens enable row level security;
alter table public.plugin_oauth_handoffs enable row level security;

revoke all on table public.figma_user_tokens from anon, authenticated, public;
revoke all on table public.plugin_oauth_handoffs from anon, authenticated, public;
grant all on table public.figma_user_tokens to service_role;
grant all on table public.plugin_oauth_handoffs to service_role;

create table public.column_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  file_key text,
  columns jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index column_sets_default_idx
  on public.column_sets (user_id)
  where file_key is null;

create unique index column_sets_file_idx
  on public.column_sets (user_id, file_key)
  where file_key is not null;

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  file_key text not null,
  figma_comment_id text not null,
  column_id uuid not null,
  sort_rank double precision not null default 0,
  ignored_at timestamptz,
  reply_count integer not null default 0,
  figma_message text not null default '',
  node_id text,
  page_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, file_key, figma_comment_id)
);

create index cards_board_idx
  on public.cards (user_id, file_key, column_id);

alter table public.users enable row level security;
alter table public.column_sets enable row level security;
alter table public.cards enable row level security;

create policy users_select_own
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

create policy users_update_own
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy column_sets_select_own
  on public.column_sets
  for select
  to authenticated
  using (user_id = auth.uid());

create policy column_sets_insert_own
  on public.column_sets
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy column_sets_update_own
  on public.column_sets
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy column_sets_delete_own
  on public.column_sets
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy cards_select_own
  on public.cards
  for select
  to authenticated
  using (user_id = auth.uid());

create policy cards_insert_own
  on public.cards
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy cards_update_own
  on public.cards
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy cards_delete_own
  on public.cards
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, update on table public.users to authenticated;
grant select, insert, update, delete on table public.column_sets to authenticated;
grant select, insert, update, delete on table public.cards to authenticated;
revoke all on table public.users from anon;
revoke all on table public.column_sets from anon;
revoke all on table public.cards from anon;
