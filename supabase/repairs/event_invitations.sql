-- Proposed event invitations. Apply before using the invitation flow.
begin;
create table public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null check(email=lower(trim(email)) and length(email)>0),
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default now()+interval '14 days',
  created_at timestamptz not null default now()
);
create index event_invites_recipient_pending on public.event_invites(email,created_at desc) where status='pending';
create index event_invites_event_id on public.event_invites(event_id);
create index event_invites_invited_by on public.event_invites(invited_by);
alter table public.event_invites enable row level security;
grant select,insert,update on public.event_invites to authenticated;
create policy event_invites_host_read on public.event_invites for select to authenticated using (
  exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
);
create policy event_invites_host_create on public.event_invites for insert to authenticated with check (
  invited_by=(select auth.uid()) and status='pending'
  and exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()) and not e.is_hidden)
);
create policy event_invites_host_update on public.event_invites for update to authenticated using (
  exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
) with check (
  invited_by=(select auth.uid()) and exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
);
create function public.my_pending_event_invites()
returns table(invite_id uuid,event_title text,token text,expires_at timestamptz,created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); actor_email text;
begin
  if actor is null then raise exception 'Please sign in first.' using errcode='42501'; end if;
  select lower(u.email) into actor_email from auth.users u where u.id=actor and u.email_confirmed_at is not null;
  if actor_email is null then return; end if;
  return query select i.id,e.title,i.token,i.expires_at,i.created_at
    from public.event_invites i join public.events e on e.id=i.event_id
    where i.email=actor_email and i.status='pending' and i.expires_at>now()
      and not e.is_hidden and i.invited_by=e.owner_id order by i.created_at desc;
end;$$;
revoke all on function public.my_pending_event_invites() from public,anon;
grant execute on function public.my_pending_event_invites() to authenticated;
create function public.accept_event_invite(invite_token text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); actor_email text; invitation public.event_invites%rowtype; host uuid; hidden boolean;
begin
  if actor is null then raise exception 'Please sign in first.' using errcode='42501'; end if;
  select lower(u.email) into actor_email from auth.users u where u.id=actor and u.email_confirmed_at is not null;
  if actor_email is null then raise exception 'Confirm your email first.' using errcode='42501'; end if;
  select * into invitation from public.event_invites i where i.token=invite_token for update;
  if not found or invitation.email is distinct from actor_email then raise exception 'Invitation unavailable for this account.' using errcode='42501'; end if;
  if invitation.status<>'pending' or invitation.expires_at<=now() then raise exception 'Invitation is expired or no longer pending.'; end if;
  select e.owner_id,e.is_hidden into host,hidden from public.events e where e.id=invitation.event_id for update;
  if not found or hidden then raise exception 'This event is no longer available.'; end if;
  if invitation.invited_by is distinct from host then raise exception 'Invitation sender no longer has permission.' using errcode='42501'; end if;
  if actor=host then raise exception 'You are already the host of this event.'; end if;
  -- Existing capacity trigger serializes joins and rejects full events.
  insert into public.rsvps(event_id,user_id) values(invitation.event_id,actor) on conflict(event_id,user_id) do nothing;
  update public.event_invites set status='accepted' where id=invitation.id;
  return invitation.event_id;
end;$$;
revoke all on function public.accept_event_invite(text) from public,anon;
grant execute on function public.accept_event_invite(text) to authenticated;
commit;