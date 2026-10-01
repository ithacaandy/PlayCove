-- PlayCove v02: allow owners to read their groups and establish their own membership.
-- Adds two scoped policies; retains all existing policies and keeps RLS enabled.
begin;

create policy groups_owner_select
on public.groups for select
to authenticated
using (owner_id = (select auth.uid()));

create policy gm_owner_self_insert
on public.group_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and status = 'active'
  and exists (
    select 1 from public.groups as g
    where g.id = group_members.group_id
      and g.owner_id = (select auth.uid())
  )
);

commit;