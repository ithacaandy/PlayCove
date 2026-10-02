-- Applied October 1, 2026 as linklemon_beta_feedback. Do not replay.
create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id),
  category text not null check (category in ('bug','idea','other')),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  page_path text not null default '/' check (page_path ~ '^/[A-Za-z0-9/_-]*$' and char_length(page_path) <= 200),
  created_at timestamptz not null default now()
);
alter table public.beta_feedback enable row level security;
revoke all on public.beta_feedback from public, anon, authenticated;
grant select, insert on public.beta_feedback to authenticated;
create policy feedback_read_own on public.beta_feedback for select to authenticated using (reporter_id = (select auth.uid()));
create policy feedback_submit_own on public.beta_feedback for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy linklemon_beta_access on public.beta_feedback as restrictive for all to anon, authenticated
using ((select linklemon_private.beta_allowed())) with check ((select linklemon_private.beta_allowed()));
create index beta_feedback_reporter_created on public.beta_feedback(reporter_id, created_at desc);
