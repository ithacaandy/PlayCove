create table public.notification_preferences (
 user_id uuid primary key references auth.users(id), enabled boolean not null default false,
 paused_until timestamptz, updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public,anon,authenticated;
grant select,insert on public.notification_preferences to authenticated;
grant update(enabled,paused_until,updated_at) on public.notification_preferences to authenticated;
create policy preferences_read on public.notification_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy preferences_insert on public.notification_preferences for insert to authenticated with check(user_id=(select auth.uid()));
create policy preferences_update on public.notification_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy linklemon_beta_access on public.notification_preferences as restrictive for all to authenticated using((select linklemon_private.beta_allowed())) with check((select linklemon_private.beta_allowed()));
