-- Proposed: expose only the signed-in recipient's current pending invitations.
begin;
create function public.my_pending_group_invites()
returns table(invite_id uuid, group_name text, token text, expires_at timestamptz, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); actor_email text;
begin
  if actor is null then raise exception 'Please sign in first.' using errcode='42501'; end if;
  select lower(u.email) into actor_email from auth.users u where u.id=actor and u.email_confirmed_at is not null;
  if actor_email is null then return; end if;
  return query select i.id,g.name,i.token,i.expires_at,i.created_at
    from public.group_invites i join public.groups g on g.id=i.group_id
    where lower(i.email)=actor_email and i.status='pending' and i.expires_at>now()
      and (i.invited_by=g.owner_id or exists (
        select 1 from public.group_members m where m.group_id=i.group_id and m.user_id=i.invited_by
          and m.role='admin' and m.status in ('active','accepted','approved','member')
      )) order by i.created_at desc;
end;
$$;
revoke all on function public.my_pending_group_invites() from public,anon;
grant execute on function public.my_pending_group_invites() to authenticated;
commit;