create function linklemon_private.push_setup(action text,device_endpoint text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); session uuid:=(auth.jwt()->>'session_id')::uuid; device uuid; last_test timestamptz;
begin
 if actor is null or not linklemon_private.beta_allowed() or not exists(select 1 from auth.sessions where id=session and user_id=actor) then raise exception 'Not allowed' using errcode='42501'; end if;
 select id into device from linklemon_private.push_devices where user_id=actor and session_id=session and endpoint=device_endpoint for update;
 if action='status' then return jsonb_build_object('registered',device is not null); end if;
 if action<>'test' or device is null then raise exception 'Enable this device first'; end if;
 if not exists(select 1 from linklemon_private.push_dispatch_config where enabled) then raise exception 'Delivery unavailable'; end if;
 if not exists(select 1 from public.notification_preferences where user_id=actor and enabled and (paused_until is null or paused_until<=now())) then raise exception 'Clear your pause and enable alerts before testing'; end if;
 select max(due_at) into last_test from linklemon_private.push_jobs where device_id=device and source='test';
 if last_test>now()-interval '1 minute' then raise exception 'Wait one minute before another test'; end if;
 insert into linklemon_private.push_jobs(device_id,actor,source,source_id,body,url,expires_at) values(device,actor,'test',gen_random_uuid(),'Your device alerts are ready.','/notification-settings',now()+interval '2 minutes');
 return jsonb_build_object('queued',true);
end $$;
revoke all on function linklemon_private.push_setup(text,text) from public,anon,authenticated;
grant execute on function linklemon_private.push_setup(text,text) to authenticated;
create function public.push_setup(action text,device_endpoint text) returns jsonb language sql security invoker set search_path='' as $$select linklemon_private.push_setup(action,device_endpoint)$$;
revoke all on function public.push_setup(text,text) from public,anon,authenticated;
grant execute on function public.push_setup(text,text) to authenticated;
create or replace function linklemon_private.push_eligible(job uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from linklemon_private.push_jobs j
 join linklemon_private.push_devices d on d.id=j.device_id
 join public.notification_preferences p on p.user_id=d.user_id
 join auth.users u on u.id=d.user_id
 where j.id=job and j.expires_at>now() and p.enabled and (p.paused_until is null or p.paused_until<=now())
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and (not exists(select 1 from linklemon_private.beta_settings where enabled) or exists(select 1 from linklemon_private.beta_testers where lower(email)=lower(u.email)))
 and exists(select 1 from auth.sessions s where s.id=d.session_id and s.user_id=d.user_id)
 and case j.source
 when 'test' then j.actor=d.user_id
 when 'social' then exists(select 1 from linklemon_private.social_notices n join linklemon_private.outings o on o.id=n.outing_id where n.id=j.source_id and n.read_at is null and o.ends_at>now() and (o.cancelled_at is null or n.kind='cancelled'))
 when 'connection' then exists(select 1 from linklemon_private.connections c where c.id=j.source_id and c.status='pending')
 when 'group_invites' then exists(select 1 from public.group_invites i where i.id=j.source_id and i.status='pending' and i.expires_at>now())
 when 'event_invites' then exists(select 1 from public.event_invites i where i.id=j.source_id and i.status='pending' and i.expires_at>now())
 when 'event_update' then exists(select 1 from public.event_notifications n where n.id=j.source_id and n.read_at is null)
 else false end);
$$;
