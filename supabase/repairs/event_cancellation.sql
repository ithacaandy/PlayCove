
begin;
alter table public.events add column cancelled_at timestamptz;
create table public.event_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id uuid not null references public.events(id) on delete cascade,
 event_title text not null,
 kind text not null check(kind='cancelled'),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(user_id,event_id,kind)
);
create index event_notifications_recipient on public.event_notifications(user_id,created_at desc);
create index event_notifications_event on public.event_notifications(event_id);
alter table public.event_notifications enable row level security;
revoke all on public.event_notifications from public,anon,authenticated;
grant select on public.event_notifications to authenticated;
grant update(read_at) on public.event_notifications to authenticated;
create policy event_notifications_read on public.event_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy event_notifications_mark_read on public.event_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function playcove_private.guard_event_cancellation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.cancelled_at is distinct from old.cancelled_at then
  if auth.uid() is null or auth.uid() is distinct from old.owner_id then raise exception 'Only the host can cancel this event.' using errcode='42501'; end if;
  if old.cancelled_at is not null then raise exception 'A cancelled event cannot be reopened. Clone it to repost.'; end if;
  new.cancelled_at:=now();
 end if;
 return new;
end;$$;
revoke all on function playcove_private.guard_event_cancellation() from public,anon,authenticated;
create trigger guard_event_cancellation before update on public.events for each row execute function playcove_private.guard_event_cancellation();
create function playcove_private.notify_event_cancellation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.cancelled_at is null and new.cancelled_at is not null then
  insert into public.event_notifications(user_id,event_id,event_title,kind)
  select r.user_id,new.id,new.title,'cancelled' from public.rsvps r where r.event_id=new.id and r.user_id<>new.owner_id
  on conflict(user_id,event_id,kind) do nothing;
 end if;
 return new;
end;$$;
revoke all on function playcove_private.notify_event_cancellation() from public,anon,authenticated;
create trigger notify_event_cancellation after update on public.events for each row execute function playcove_private.notify_event_cancellation();
create function playcove_private.reject_cancelled_rsvp()
returns trigger language plpgsql security definer set search_path='' as $$
declare cancelled timestamptz;
begin
 if auth.uid() is null or new.user_id is distinct from auth.uid() then raise exception 'Please RSVP only for yourself.' using errcode='42501'; end if;
 select e.cancelled_at into cancelled from public.events e where e.id=new.event_id for update;
 if cancelled is not null then raise exception 'This event has been cancelled.'; end if;
 return new;
end;$$;
revoke all on function playcove_private.reject_cancelled_rsvp() from public,anon,authenticated;
create trigger reject_cancelled_rsvp before insert or update on public.rsvps for each row execute function playcove_private.reject_cancelled_rsvp();
create or replace function public.my_pending_event_invites()
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
      and not e.is_hidden and e.cancelled_at is null and i.invited_by=e.owner_id order by i.created_at desc;
end;$$;

commit;
