-- Cleanup script for PlayCove v4.9
-- Deletes all groups, memberships, and events owned by a given user.

do $$
declare
  u uuid := 'SECOND_USER_UUID_HERE';
begin
  delete from public.rsvps r using public.events e where r.event_id = e.id and e.owner_id = u;
  delete from public.events where owner_id = u;
  delete from public.group_members gm using public.groups g where gm.group_id = g.id and g.owner_id = u;
  delete from public.groups where owner_id = u;
  delete from public.group_members where user_id = u;
end
$$;
