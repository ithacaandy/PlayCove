-- New private delivery queue. Existing subscriptions are intentionally not imported.
create table linklemon_private.push_devices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, endpoint text unique not null, p256dh text not null, auth text not null,
 created_at timestamptz not null default now()
);
create index push_device_owner on linklemon_private.push_devices(user_id);
create table linklemon_private.push_jobs (
 id uuid primary key default gen_random_uuid(), device_id uuid not null references linklemon_private.push_devices(id) on delete cascade,
 actor uuid, source text not null, source_id uuid not null, body text not null, url text not null,
 urgent boolean not null default false, expires_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','working','sent','skipped')),
 attempts integer not null default 0, due_at timestamptz not null default now(), lease uuid,
 unique(device_id,source,source_id)
);
create index push_job_due on linklemon_private.push_jobs(due_at) where status in ('pending','working');
alter table linklemon_private.push_devices enable row level security;
alter table linklemon_private.push_jobs enable row level security;
revoke all on linklemon_private.push_devices,linklemon_private.push_jobs from public,anon,authenticated;

create function linklemon_private.push_device(action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); session uuid:=(auth.jwt()->>'session_id')::uuid; device_endpoint text:=payload->>'endpoint';
begin
 if actor is null or not linklemon_private.beta_allowed() or not exists(select 1 from auth.sessions where id=session and user_id=actor) then raise exception 'Not allowed' using errcode='42501'; end if;
 if action='register' then
  if length(device_endpoint)>2048 or device_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com)/' or length(payload#>>'{keys,p256dh}') not between 87 and 88 or length(payload#>>'{keys,auth}') not between 22 and 24 then raise exception 'Invalid device'; end if;
  if (select count(*) from linklemon_private.push_devices where user_id=actor and push_devices.endpoint<>device_endpoint)>=10 then raise exception 'Too many devices'; end if;
  -- Rebinding the same browser to another signed-in account invalidates its old jobs.
  delete from linklemon_private.push_devices d where d.endpoint=device_endpoint;
  insert into linklemon_private.push_devices(user_id,session_id,endpoint,p256dh,auth) values(actor,session,device_endpoint,payload#>>'{keys,p256dh}',payload#>>'{keys,auth}');
  insert into public.notification_preferences(user_id,enabled) values(actor,true) on conflict(user_id) do update set enabled=true,updated_at=now();
 elsif action='remove' then
  delete from linklemon_private.push_devices where user_id=actor and session_id=session;
 else raise exception 'Invalid action'; end if;
 return (select jsonb_build_object('enabled',enabled,'paused_until',paused_until) from public.notification_preferences where user_id=actor);
end $$;
revoke all on function linklemon_private.push_device(text,jsonb) from public,anon,authenticated;
grant execute on function linklemon_private.push_device(text,jsonb) to authenticated;
create function public.push_device(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select linklemon_private.push_device(action,payload)$$;
revoke all on function public.push_device(text,jsonb) from public,anon,authenticated;
grant execute on function public.push_device(text,jsonb) to authenticated;

create function linklemon_private.queue_push(target uuid,source text,source_id uuid,body text,url text,expires_at timestamptz,urgent boolean default false)
returns void language sql security definer set search_path='' as $$
 insert into linklemon_private.push_jobs(device_id,actor,source,source_id,body,url,expires_at,urgent)
 select d.id,auth.uid(),source,source_id,body,url,least(expires_at,now()+interval '10 minutes'),urgent
 from linklemon_private.push_devices d join public.notification_preferences p on p.user_id=d.user_id
 where d.user_id=target and p.enabled and (p.paused_until is null or p.paused_until<=now()) and expires_at>now()
 and exists(select 1 from auth.sessions s where s.id=d.session_id and s.user_id=d.user_id)
 on conflict(device_id,source,source_id) do nothing;
$$;
revoke all on function linklemon_private.queue_push(uuid,text,uuid,text,text,timestamptz,boolean) from public,anon,authenticated;

create function linklemon_private.queue_notice_push() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; expiry timestamptz;
begin
 if tg_table_name='social_notices' then
  select ends_at into expiry from linklemon_private.outings where id=new.outing_id;
  perform linklemon_private.queue_push(new.user_id,'social',new.id,case new.kind when 'outing' then 'Someone in your circle is heading out. Want to join?' when 'joined' then 'Someone is joining your outing.' else 'An outing was cancelled.' end,'/outings/'||new.outing_id,expiry,new.kind='outing');
 elsif tg_table_name='connections' then
  perform linklemon_private.queue_push(new.recipient,'connection',new.id,'You have a new connection request.','/notifications',now()+interval '10 minutes');
 elsif tg_table_name='event_notifications' then
  perform linklemon_private.queue_push(new.user_id,'event_update',new.id,'An event you’re attending has an update.','/notifications',now()+interval '10 minutes');
 else
  select id into target from auth.users where lower(email)=lower(new.email) and email_confirmed_at is not null and not coalesce(is_anonymous,false);
  if target is not null and new.status='pending' then
   perform linklemon_private.queue_push(target,tg_table_name,new.id,case tg_table_name when 'group_invites' then 'You have a new group invitation.' else 'You have a new event invitation.' end,'/notifications',new.expires_at);
  end if;
 end if;
 return new;
end $$;
revoke all on function linklemon_private.queue_notice_push() from public,anon,authenticated;
create trigger queue_social_push after insert on linklemon_private.social_notices for each row execute function linklemon_private.queue_notice_push();
create trigger queue_connection_push after insert on linklemon_private.connections for each row execute function linklemon_private.queue_notice_push();
create trigger queue_event_update_push after insert on public.event_notifications for each row execute function linklemon_private.queue_notice_push();
create trigger queue_group_invite_push after insert on public.group_invites for each row execute function linklemon_private.queue_notice_push();
create trigger queue_event_invite_push after insert on public.event_invites for each row execute function linklemon_private.queue_notice_push();

-- Pauses and Off discard pending work immediately; resuming never replays it.
create function linklemon_private.skip_muted_jobs() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.enabled or new.paused_until>now() then
  update linklemon_private.push_jobs j set status='skipped' from linklemon_private.push_devices d where j.device_id=d.id and d.user_id=new.user_id and j.status in ('pending','working');
 end if; return new;
end $$;
revoke all on function linklemon_private.skip_muted_jobs() from public,anon,authenticated;
create trigger skip_muted_push after insert or update on public.notification_preferences for each row execute function linklemon_private.skip_muted_jobs();

create function linklemon_private.push_eligible(job uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from linklemon_private.push_jobs j
 join linklemon_private.push_devices d on d.id=j.device_id
 join public.notification_preferences p on p.user_id=d.user_id
 join auth.users u on u.id=d.user_id
 where j.id=job and j.expires_at>now() and p.enabled and (p.paused_until is null or p.paused_until<=now())
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and (not exists(select 1 from linklemon_private.beta_settings where enabled) or exists(select 1 from linklemon_private.beta_testers where lower(email)=lower(u.email)))
 and exists(select 1 from auth.sessions s where s.id=d.session_id and s.user_id=d.user_id)
 and case j.source
 when 'social' then exists(select 1 from linklemon_private.social_notices n join linklemon_private.outings o on o.id=n.outing_id where n.id=j.source_id and n.read_at is null and o.ends_at>now() and (o.cancelled_at is null or n.kind='cancelled'))
 when 'connection' then exists(select 1 from linklemon_private.connections c where c.id=j.source_id and c.status='pending')
 when 'group_invites' then exists(select 1 from public.group_invites i where i.id=j.source_id and i.status='pending' and i.expires_at>now())
 when 'event_invites' then exists(select 1 from public.event_invites i where i.id=j.source_id and i.status='pending' and i.expires_at>now())
 when 'event_update' then exists(select 1 from public.event_notifications n where n.id=j.source_id and n.read_at is null)
 else false end);
$$;
revoke all on function linklemon_private.push_eligible(uuid) from public,anon,authenticated;

create function linklemon_private.push_work(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; item uuid:=(payload->>'id')::uuid; lease_id uuid:=(payload->>'lease')::uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Not allowed' using errcode='42501'; end if;
 if action='claim' then
  update linklemon_private.push_jobs set status='skipped' where status in ('pending','working') and (expires_at<=now() or attempts>=4 or not linklemon_private.push_eligible(id));
  with candidates as (select id from linklemon_private.push_jobs where status in ('pending','working') and due_at<=now() and (payload->>'actor' is null or actor=(payload->>'actor')::uuid) order by due_at limit 100 for update skip locked),
  claimed as (update linklemon_private.push_jobs j set status='working',attempts=attempts+1,lease=gen_random_uuid(),due_at=now()+interval '2 minutes' from candidates c where j.id=c.id returning j.*)
  select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'lease',j.lease,'subscription',jsonb_build_object('endpoint',d.endpoint,'keys',jsonb_build_object('p256dh',d.p256dh,'auth',d.auth)),'body',j.body,'url',j.url,'tag',j.source_id,'expires_at',j.expires_at,'urgent',j.urgent)),'[]'::jsonb) into result from claimed j join linklemon_private.push_devices d on d.id=j.device_id;
  return result;
 elsif action='eligible' then return to_jsonb(exists(select 1 from linklemon_private.push_jobs where id=item and lease=lease_id and status='working' and linklemon_private.push_eligible(id)));
 elsif action='finish' then
  if payload->>'outcome'='expired' then
   delete from linklemon_private.push_devices where id=(select device_id from linklemon_private.push_jobs where id=item and lease=lease_id and status='working');
  else
   update linklemon_private.push_jobs set status=case payload->>'outcome' when 'sent' then 'sent' when 'retry' then case when attempts<4 then 'pending' else 'skipped' end else 'skipped' end,due_at=now()+interval '30 seconds',lease=null where id=item and lease=lease_id and status='working';
  end if;
  return '{}'::jsonb;
 end if; raise exception 'Invalid action';
end $$;
revoke all on function linklemon_private.push_work(text,jsonb) from public,anon,authenticated;
grant execute on function linklemon_private.push_work(text,jsonb) to service_role;
create function public.push_work(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select linklemon_private.push_work(action,payload)$$;
revoke all on function public.push_work(text,jsonb) from public,anon,authenticated;
grant execute on function public.push_work(text,jsonb) to service_role;

grant usage on schema linklemon_private to service_role;
