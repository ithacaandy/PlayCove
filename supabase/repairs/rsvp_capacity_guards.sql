-- Proposed RSVP capacity enforcement. Review before applying to PlayCove v02.
-- Existing RSVP visibility and ownership policies remain unchanged.
begin;

create schema if not exists playcove_private;
revoke all on schema playcove_private from public, anon, authenticated;

alter table public.events
  add constraint events_capacity_positive check (capacity > 0);

-- Counting across the protected RSVP table requires a privileged internal trigger.
-- It authenticates the actor, exposes no attendee data, and is not an RPC endpoint.
create function playcove_private.enforce_rsvp_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  event_capacity integer;
  event_hidden boolean;
  attendee_count bigint;
begin
  if actor is null or new.user_id is distinct from actor then
    raise exception 'Please sign in and RSVP only for yourself.' using errcode = '42501';
  end if;

  -- All concurrent joins and capacity edits serialize on the same event row.
  select e.capacity, e.is_hidden into event_capacity, event_hidden
  from public.events e where e.id = new.event_id for update;
  if not found then
    raise exception 'Event not found.' using errcode = 'P0001';
  end if;
  if event_hidden then
    raise exception 'This event is no longer available.' using errcode = 'P0001';
  end if;

  -- A repeat RSVP must not consume another place.
  if exists (select 1 from public.rsvps r where r.event_id = new.event_id and r.user_id = new.user_id) then
    return new;
  end if;
  select count(*) into attendee_count from public.rsvps r where r.event_id = new.event_id;
  if attendee_count >= event_capacity then
    raise exception 'This event is full.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function playcove_private.enforce_rsvp_capacity() from public, anon, authenticated;

create trigger enforce_rsvp_capacity
before insert or update of event_id, user_id on public.rsvps
for each row execute function playcove_private.enforce_rsvp_capacity();

create function playcove_private.prevent_capacity_below_rsvps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  attendee_count bigint;
begin
  if actor is null or not coalesce((
    old.owner_id = actor
    or public.is_admin(actor)
    or public.is_admin_or_owner(old.group_id)
  ), false) then
    raise exception 'Only the host or an authorized admin can change capacity.' using errcode = '42501';
  end if;
  select count(*) into attendee_count from public.rsvps r where r.event_id = old.id;
  if new.capacity < attendee_count then
    raise exception 'Capacity cannot be lower than the current RSVP count.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function playcove_private.prevent_capacity_below_rsvps() from public, anon, authenticated;

create trigger prevent_capacity_below_rsvps
before update of capacity on public.events
for each row execute function playcove_private.prevent_capacity_below_rsvps();

commit;