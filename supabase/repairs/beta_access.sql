-- Applied October 1, 2026 as remote migration linklemon_beta_access. Do not replay.
-- Initial beta restriction stays off until the application and denial tests pass.
create schema if not exists linklemon_private;
revoke all on schema linklemon_private from public;
grant usage on schema linklemon_private to anon, authenticated;
create table linklemon_private.beta_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
create table linklemon_private.beta_testers (
  email text primary key check (email = lower(trim(email)))
);
alter table linklemon_private.beta_settings enable row level security;
alter table linklemon_private.beta_testers enable row level security;
revoke all on all tables in schema linklemon_private from public, anon, authenticated;
insert into linklemon_private.beta_settings values (true, false);
insert into linklemon_private.beta_testers values
  ('ithaca.andy@gmail.com'), ('abn48@cornell.edu');

-- Private lookup needs definer privileges; it only returns access for auth.uid().
create function linklemon_private.beta_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    not (select enabled from linklemon_private.beta_settings where singleton)
    or exists (
      select 1 from auth.users u
      join linklemon_private.beta_testers t on t.email = lower(u.email)
      where u.id = auth.uid() and u.email_confirmed_at is not null
        and not coalesce(u.is_anonymous, false)
    )
  );
$$;
revoke all on function linklemon_private.beta_allowed() from public;
grant execute on function linklemon_private.beta_allowed() to anon, authenticated;

create function public.my_beta_access() returns boolean
language sql stable security invoker set search_path = '' as $$
  select linklemon_private.beta_allowed();
$$;
revoke all on function public.my_beta_access() from public;
grant execute on function public.my_beta_access() to anon, authenticated;

-- Restrictive policies add an AND condition; existing ownership policies stay intact.
do $$ declare item record; begin
  for item in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
  loop
    execute format('alter table public.%I enable row level security', item.relname);
    execute format('create policy linklemon_beta_access on public.%I as restrictive for all to anon, authenticated using ((select linklemon_private.beta_allowed())) with check ((select linklemon_private.beta_allowed()))', item.relname);
  end loop;
end $$;

create policy linklemon_beta_access on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id not in ('avatars', 'event-images') or (select linklemon_private.beta_allowed()))
with check (bucket_id not in ('avatars', 'event-images') or (select linklemon_private.beta_allowed()));

alter view public.event_report_counts set (security_invoker = true);

-- These existing definer routines bypass table RLS, so they need an explicit check.
-- Preserve their signatures, configuration and original logic using pg_get_functiondef.
do $$ declare item record; definition text; guarded text; begin
  for item in select p.oid,p.prosrc,l.lanname from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
    where n.nspname='public' and p.prosecdef and p.proname in (
      'accept_group_invite','accept_event_invite','my_pending_group_invites',
      'my_pending_event_invites','is_admin','is_active_member','is_admin_or_owner')
  loop
    definition := pg_get_functiondef(item.oid);
    if item.lanname='plpgsql' then
      guarded := regexp_replace(item.prosrc, '\mbegin\M',
        'begin' || chr(10) || '  if not linklemon_private.beta_allowed() then raise exception ''This account does not have beta access.'' using errcode=''42501''; end if;', 'i');
      if guarded=item.prosrc then raise exception 'Expected PL/pgSQL body missing: %', item.oid; end if;
    elsif item.lanname='sql' then
      guarded := 'select linklemon_private.beta_allowed() and (' || regexp_replace(trim(item.prosrc), ';\s*$', '') || ');';
    else raise exception 'Unexpected routine language';
    end if;
    execute replace(definition, item.prosrc, guarded);
  end loop;
end $$;
