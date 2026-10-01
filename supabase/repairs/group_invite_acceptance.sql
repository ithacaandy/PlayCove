-- Proposed only: recipient-checked atomic invitation acceptance.
-- Review and apply before enabling POST acceptance in the application.
begin;
create function public.accept_group_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_email text;
  invitation public.group_invites%rowtype;
  group_owner uuid;
begin
  if actor is null then raise exception 'Please sign in first.' using errcode='42501'; end if;
  select lower(u.email) into actor_email from auth.users u
    where u.id=actor and u.email_confirmed_at is not null;
  if actor_email is null then raise exception 'Confirm your email before accepting an invitation.' using errcode='42501'; end if;
  select * into invitation from public.group_invites i where i.token=invite_token for update;
  if not found or lower(invitation.email)<>actor_email then raise exception 'Invitation unavailable for this account.' using errcode='42501'; end if;
  if invitation.status<>'pending' or invitation.expires_at is null or invitation.expires_at<=now() then
    raise exception 'Invitation is expired or no longer pending.';
  end if;
  select g.owner_id into group_owner from public.groups g where g.id=invitation.group_id;
  if not found then raise exception 'Group unavailable.'; end if;
  if invitation.invited_by is distinct from group_owner and not exists (
    select 1 from public.group_members m where m.group_id=invitation.group_id
      and m.user_id=invitation.invited_by and m.role='admin'
      and m.status in ('active','accepted','approved','member')
  ) then raise exception 'Invitation sender no longer has permission.' using errcode='42501'; end if;
  insert into public.group_members(group_id,user_id,status,role)
    values(invitation.group_id,actor,'active',case when actor=group_owner then 'owner' else 'member' end)
    on conflict(group_id,user_id) do update set status='active', role=case
      when actor=group_owner then 'owner'
      when group_members.status in ('active','accepted','approved','member') then group_members.role
      else 'member' end;
  update public.group_invites set status='accepted' where id=invitation.id;
  return invitation.group_id;
end;
$$;
revoke all on function public.accept_group_invite(text) from public,anon;
grant execute on function public.accept_group_invite(text) to authenticated;
-- Pending requests cannot nominate themselves as admins/owners or request private groups.
alter policy gm_self_request_insert on public.group_members with check (
  user_id=(select auth.uid()) and status='pending' and role='member'
  and exists(select 1 from public.groups g where g.id=group_members.group_id and g.is_discoverable)
);
commit;