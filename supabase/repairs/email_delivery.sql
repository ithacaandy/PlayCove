-- Additive email delivery. Opt-in only; existing notifications and push queues are unchanged.
create table linklemon_private.email_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false, heading_out boolean not null default true,
 paused_until timestamptz,
 unsubscribe_token text not null unique default replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
 updated_at timestamptz not null default now()
);
create table linklemon_private.email_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 recipient_email text not null, unsubscribe_token text not null,
 source text not null check(source in ('social','connection','group_invites','event_invites','event_update','test')),
 source_id uuid not null, subject text not null, body text not null, url text not null,
 expires_at timestamptz not null, status text not null default 'pending' check(status in ('pending','working','sent','skipped')),
 attempts integer not null default 0, due_at timestamptz not null default now(), lease uuid,
 created_at timestamptz not null default now(), unique(user_id,source,source_id)
);
create index email_job_due on linklemon_private.email_jobs(due_at) where status in ('pending','working');
alter table linklemon_private.email_preferences enable row level security;
alter table linklemon_private.email_jobs enable row level security;
revoke all on linklemon_private.email_preferences,linklemon_private.email_jobs from public,anon,authenticated;

create function linklemon_private.email_settings(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); until_time timestamptz;
begin
 if actor is null or not linklemon_private.beta_allowed() or not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)) then raise exception 'Not allowed' using errcode='42501'; end if;
 if action not in ('get','enable','off','pause','resume','heading_out','test') then raise exception 'Invalid action'; end if;
 insert into linklemon_private.email_preferences(user_id) values(actor) on conflict(user_id) do nothing;
 if action='test' then
  if not exists(select 1 from linklemon_private.email_preferences p where p.user_id=actor and p.enabled and (p.paused_until is null or p.paused_until<=now())) then raise exception 'Enable email and clear the pause before testing'; end if;
  if exists(select 1 from linklemon_private.email_jobs j where j.user_id=actor and j.source='test' and j.created_at>now()-interval '1 minute') then raise exception 'Wait one minute before another test'; end if;
  insert into linklemon_private.email_jobs(user_id,recipient_email,unsubscribe_token,source,source_id,subject,body,url,expires_at)
  select actor,lower(u.email),p.unsubscribe_token,'test',gen_random_uuid(),'Your LinkLemon email is ready','Life’s busy, squeeze in some fun. You’ll receive the notification types you selected.','/notification-settings',now()+interval '5 minutes'
  from linklemon_private.email_preferences p join auth.users u on u.id=p.user_id where p.user_id=actor;
 end if;
 if action='pause' then
  until_time:=(payload->>'until')::timestamptz;
  if until_time is null or until_time<=now() or until_time>now()+interval '366 days' then raise exception 'Invalid pause'; end if;
 elsif action='heading_out' and jsonb_typeof(payload->'enabled') is distinct from 'boolean' then raise exception 'Invalid preference'; end if;
 update linklemon_private.email_preferences p set
  enabled=case action when 'enable' then true when 'off' then false else p.enabled end,
  heading_out=case action when 'heading_out' then (payload->>'enabled')::boolean else p.heading_out end,
  paused_until=case action when 'pause' then until_time when 'resume' then null when 'off' then null else p.paused_until end,
  updated_at=case when action='get' then p.updated_at else now() end
 where p.user_id=actor;
 update linklemon_private.email_jobs j set status='skipped',lease=null
 from linklemon_private.email_preferences p where p.user_id=actor and j.user_id=actor and j.status in ('pending','working')
 and (not p.enabled or p.paused_until>now() or (not p.heading_out and j.source='social'));
 return (select jsonb_build_object('enabled',p.enabled,'heading_out',p.heading_out,'paused_until',p.paused_until) from linklemon_private.email_preferences p where p.user_id=actor);
end $$;
revoke all on function linklemon_private.email_settings(text,jsonb) from public,anon,authenticated;
grant execute on function linklemon_private.email_settings(text,jsonb) to authenticated;
create function public.email_settings(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select linklemon_private.email_settings(action,payload)$$;
revoke all on function public.email_settings(text,jsonb) from public,anon,authenticated;
grant execute on function public.email_settings(text,jsonb) to authenticated;

create function linklemon_private.queue_notice_email() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; subject_line text; message_text text; link_path text; expiry timestamptz:=now()+interval '24 hours'; source_name text;
 host_name text; destination text; item_name text; invite_email text;
begin
 if tg_table_name='social_notices' then
  target:=new.user_id; source_name:='social';
  select least(o.ends_at,expiry),o.place,coalesce(nullif(trim(p.full_name),''),'Someone in your circle') into expiry,destination,host_name
   from linklemon_private.outings o left join public.profiles p on p.id=o.owner_id where o.id=new.outing_id;
  subject_line:=case new.kind when 'outing' then left(host_name,60)||' is heading out. Who’s in?' when 'joined' then 'Someone’s joining your outing' else 'An outing was cancelled' end;
  message_text:=case new.kind when 'outing' then left(host_name,60)||' is heading out to '||left(destination,120)||'. Who’s in?' else new.title end;
  link_path:='/outings/'||new.outing_id;
 elsif tg_table_name='connections' then
  if new.status<>'pending' then return new; end if;
  target:=new.recipient;source_name:='connection';
  select coalesce(nullif(trim(p.full_name),''),'Someone') into host_name from public.profiles p where p.id=new.requester;
  subject_line:='A new connection request';message_text:=coalesce(host_name,'Someone')||' wants to connect with you on LinkLemon.';link_path:='/notifications';
 elsif tg_table_name='event_notifications' then
  target:=new.user_id;source_name:='event_update';subject_line:=case new.kind when 'cancelled' then 'An event was cancelled' else 'An event has changed' end;
  message_text:=new.event_title||case new.kind when 'cancelled' then ' was cancelled.' else ' has an update. Open LinkLemon for the latest details.' end;link_path:='/events/'||new.event_id;
 else
  if new.status<>'pending' or new.expires_at<=now() then return new; end if;
  select u.id into target from auth.users u where lower(u.email)=lower(new.email) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false);
  source_name:=tg_table_name;expiry:=least(expiry,new.expires_at);
  select coalesce(nullif(trim(p.full_name),''),'Someone') into host_name from public.profiles p where p.id=new.invited_by;
  if tg_table_name='group_invites' then
   select g.name into item_name from public.groups g where g.id=new.group_id;
   subject_line:='You’re invited to a group';link_path:='/invite?token='||new.token;
  else
   select e.title into item_name from public.events e where e.id=new.event_id;
   subject_line:='You’re invited to an event';link_path:='/event-invite?token='||new.token;
  end if;
  message_text:=coalesce(host_name,'Someone')||' invited you to '||coalesce(item_name,'join them')||'. Sign in with this email address to view your invitation.';
 end if;
 insert into linklemon_private.email_jobs(user_id,recipient_email,unsubscribe_token,source,source_id,subject,body,url,expires_at)
 select target,lower(u.email),p.unsubscribe_token,source_name,new.id,left(subject_line,180),left(message_text,1000),link_path,expiry
 from linklemon_private.email_preferences p join auth.users u on u.id=p.user_id
 where p.user_id=target and p.enabled and (p.paused_until is null or p.paused_until<=now()) and (source_name<>'social' or p.heading_out)
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and expiry>now()
 and (not exists(select 1 from linklemon_private.beta_settings where enabled) or exists(select 1 from linklemon_private.beta_testers b where lower(b.email)=lower(u.email)))
 on conflict(user_id,source,source_id) do nothing;
 return new;
end $$;
revoke all on function linklemon_private.queue_notice_email() from public,anon,authenticated;
create trigger queue_social_email after insert on linklemon_private.social_notices for each row execute function linklemon_private.queue_notice_email();
create trigger queue_connection_email after insert on linklemon_private.connections for each row execute function linklemon_private.queue_notice_email();
create trigger queue_event_update_email after insert on public.event_notifications for each row execute function linklemon_private.queue_notice_email();
create trigger queue_group_invite_email after insert on public.group_invites for each row execute function linklemon_private.queue_notice_email();
create trigger queue_event_invite_email after insert on public.event_invites for each row execute function linklemon_private.queue_notice_email();

create function linklemon_private.email_eligible(job uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from linklemon_private.email_jobs j
 join linklemon_private.email_preferences p on p.user_id=j.user_id join auth.users u on u.id=j.user_id
 where j.id=job and j.expires_at>now() and p.enabled and (p.paused_until is null or p.paused_until<=now())
 and p.unsubscribe_token=j.unsubscribe_token and lower(u.email)=j.recipient_email and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and (j.source<>'social' or p.heading_out)
 and (not exists(select 1 from linklemon_private.beta_settings where enabled) or exists(select 1 from linklemon_private.beta_testers b where lower(b.email)=lower(u.email)))
 and case j.source
 when 'test' then true
 when 'social' then exists(select 1 from linklemon_private.social_notices n join linklemon_private.outings o on o.id=n.outing_id where n.id=j.source_id and n.user_id=j.user_id and n.read_at is null and o.ends_at>now() and (o.cancelled_at is null or n.kind='cancelled'))
 when 'connection' then exists(select 1 from linklemon_private.connections c where c.id=j.source_id and c.recipient=j.user_id and c.status='pending')
 when 'event_update' then exists(select 1 from public.event_notifications n where n.id=j.source_id and n.user_id=j.user_id and n.read_at is null)
 when 'group_invites' then exists(select 1 from public.group_invites i join public.groups g on g.id=i.group_id where i.id=j.source_id and lower(i.email)=j.recipient_email and i.status='pending' and i.expires_at>now() and (g.owner_id=i.invited_by or exists(select 1 from public.group_members m where m.group_id=g.id and m.user_id=i.invited_by and m.role='admin' and m.status in ('active','accepted','approved','member'))))
 when 'event_invites' then exists(select 1 from public.event_invites i join public.events e on e.id=i.event_id where i.id=j.source_id and lower(i.email)=j.recipient_email and i.status='pending' and i.expires_at>now() and e.owner_id=i.invited_by and not e.is_hidden and e.cancelled_at is null)
 else false end);
$$;
revoke all on function linklemon_private.email_eligible(uuid) from public,anon,authenticated;

create function linklemon_private.email_work(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; item uuid:=(payload->>'id')::uuid; lease_id uuid:=(payload->>'lease')::uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Not allowed' using errcode='42501'; end if;
 if action='claim' then
  update linklemon_private.email_jobs set status='skipped',lease=null where status in ('pending','working') and (expires_at<=now() or attempts>=4 or not linklemon_private.email_eligible(id));
  with candidates as (select id from linklemon_private.email_jobs where status in ('pending','working') and due_at<=now() order by due_at limit 5 for update skip locked),
  claimed as (update linklemon_private.email_jobs j set status='working',attempts=attempts+1,lease=gen_random_uuid(),due_at=now()+interval '2 minutes' from candidates c where c.id=j.id returning j.*)
  select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'lease',j.lease,'to',j.recipient_email,'unsubscribe_token',j.unsubscribe_token,'source',j.source,'subject',j.subject,'body',j.body,'url',j.url,'expires_at',j.expires_at)),'[]'::jsonb) into result from claimed j;
  return result;
 elsif action='eligible' then return to_jsonb(exists(select 1 from linklemon_private.email_jobs j where j.id=item and j.lease=lease_id and j.status='working' and linklemon_private.email_eligible(j.id)));
 elsif action='finish' then
  update linklemon_private.email_jobs j set status=case payload->>'outcome' when 'sent' then 'sent' when 'retry' then case when j.attempts<4 then 'pending' else 'skipped' end else 'skipped' end,
  due_at=now()+interval '2 minutes',lease=null where j.id=item and j.lease=lease_id and j.status='working';return '{}'::jsonb;
 end if;raise exception 'Invalid action';
end $$;
revoke all on function linklemon_private.email_work(text,jsonb) from public,anon,authenticated;
grant execute on function linklemon_private.email_work(text,jsonb) to service_role;
create function public.email_work(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select linklemon_private.email_work(action,payload)$$;
revoke all on function public.email_work(text,jsonb) from public,anon,authenticated;
grant execute on function public.email_work(text,jsonb) to service_role;

create function linklemon_private.email_unsubscribe(token_value text) returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Not allowed' using errcode='42501'; end if;
 if token_value !~ '^[0-9a-f]{64}$' then return; end if;
 update linklemon_private.email_preferences p set enabled=false,paused_until=null,updated_at=now() where p.unsubscribe_token=token_value returning p.user_id into target;
 update linklemon_private.email_jobs j set status='skipped',lease=null where j.user_id=target and j.status in ('pending','working');
end $$;
revoke all on function linklemon_private.email_unsubscribe(text) from public,anon,authenticated;
grant execute on function linklemon_private.email_unsubscribe(text) to service_role;
create function public.email_unsubscribe(token_value text) returns void language sql security invoker set search_path='' as $$select linklemon_private.email_unsubscribe(token_value)$$;
revoke all on function public.email_unsubscribe(text) from public,anon,authenticated;
grant execute on function public.email_unsubscribe(text) to service_role;
