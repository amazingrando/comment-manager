BEGIN;
SELECT plan(4);

SELECT set_config('app.user_a', 'a1111111-1111-4111-8111-111111111111', true);
SELECT set_config('app.user_b', 'a2222222-2222-4222-8222-222222222222', true);
SELECT set_config('app.col_a', 'a3333333-3333-4333-8333-333333333331', true);

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    current_setting('app.user_a')::uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'a@example.com',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    current_setting('app.user_b')::uuid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b@example.com',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.users (id, figma_user_id, email, handle)
VALUES
  (current_setting('app.user_a')::uuid, 'figma-a', 'a@example.com', 'a'),
  (current_setting('app.user_b')::uuid, 'figma-b', 'b@example.com', 'b');

INSERT INTO public.cards (
  user_id,
  file_key,
  figma_comment_id,
  column_id,
  figma_message
)
VALUES (
  current_setting('app.user_a')::uuid,
  'file-key',
  'comment-1',
  current_setting('app.col_a')::uuid,
  'Fix this'
);

SELECT set_config('request.jwt.claim.sub', current_setting('app.user_a'), true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('app.user_a'),
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::integer FROM public.cards),
  1,
  'owner can select own cards'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', current_setting('app.user_b'), true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('app.user_b'),
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::integer FROM public.cards),
  0,
  'other user cannot select those cards'
);

SELECT throws_ok(
  format(
    $$INSERT INTO public.cards (user_id, file_key, figma_comment_id, column_id, figma_message)
      VALUES (%L, 'file-key', 'stolen', %L, 'no')$$,
    current_setting('app.user_a'),
    current_setting('app.col_a')
  ),
  '42501',
  NULL,
  'cannot insert a card for another user'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.figma_user_tokens$$,
  '42501',
  NULL,
  'authenticated cannot read figma tokens'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
