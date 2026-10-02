-- Additive Connections and Heading out foundation. Reviewed before remote application.
create table linklemon_private.connections (
 id uuid primary key default gen_random_uuid(), requester uuid not null references auth.users(id),
 recipient uuid not null references auth.users(id), status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(), check(requester<>recipient)
);
create unique index connections_pair on linklemon_private.connections(least(requester,recipient),greatest(requester,recipient));
create index connections_recipient on linklemon_private.connections(recipient,status);
create table linklemon_private.outings (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 place text not null check(length(trim(place)) between 2 and 120), message text not null default '' check(length(message)<=500),
 starts_at timestamptz not null, ends_at timestamptz not null, cancelled_at timestamptz,
 created_at timestamptz not null default now(), check(ends_at>starts_at and ends_at<=starts_at+interval '8 hours')
);
create index outings_owner on linklemon_private.outings(owner_id,ends_at);
create table linklemon_private.outing_recipients (
 outing_id uuid not null references linklemon_private.outings(id), user_id uuid not null references auth.users(id),
 going boolean not null default false, primary key(outing_id,user_id)
);
create index outings_recipient on linklemon_private.outing_recipients(user_id,outing_id);
create table linklemon_private.social_notices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 outing_id uuid not null references linklemon_private.outings(id), kind text not null check(kind in ('outing','joined','cancelled')),
 title text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create index social_unread on linklemon_private.social_notices(user_id,created_at desc) where read_at is null;
alter table linklemon_private.connections enable row level security;
alter table linklemon_private.outings enable row level security;
alter table linklemon_private.outing_recipients enable row level security;
alter table linklemon_private.social_notices enable row level security;
revoke all on linklemon_private.connections,linklemon_private.outings,linklemon_private.outing_recipients,linklemon_private.social_notices from public,anon,authenticated;

-- One constrained internal operation; no direct client access to private tables or auth.users.
create function linklemon_private.social_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target uuid; item uuid; result jsonb; actor_name text;
 groups_selected uuid[]; people_selected uuid[]; recipients uuid[]; starts timestamptz; ends timestamptz; place_name text;
begin
 if actor is null or not linklemon_private.beta_allowed() then raise exception 'This account cannot access Connections.' using errcode='42501'; end if;
 select coalesce(nullif(trim(p.full_name),''),'Someone') into actor_name from public.profiles p where p.id=actor;
 actor_name:=coalesce(actor_name,'Someone');
 if action='connections' then
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'user_id',p.id,'name',coalesce(nullif(p.full_name,''),'Member'),'created_at',c.created_at,'status',c.status,'incoming',c.recipient=actor) order by c.created_at desc),'[]'::jsonb)
   into result from linklemon_private.connections c left join public.profiles p on p.id=case when c.requester=actor then c.recipient else c.requester end
   where (c.requester=actor or c.recipient=actor) and c.status in ('pending','accepted');
  return result;
 elsif action='request_connection' then
  if length(payload->>'email')>254 or (payload->>'email') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Enter a valid email address.'; end if;
  -- Exact lookup only. Response never reveals whether an account exists.
  if (select count(*) from linklemon_private.connections c where c.requester=actor and c.created_at>now()-interval '1 day')>=20 then raise exception 'Please wait before sending more requests.'; end if;
  select u.id into target from auth.users u where lower(u.email)=lower(trim(payload->>'email')) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false);
  if target is not null and target<>actor then
   insert into linklemon_private.connections(requester,recipient) values(actor,target)
   on conflict((least(requester,recipient)),(greatest(requester,recipient))) do nothing;
  end if;
  return jsonb_build_object('ok',true);
 elsif action='respond_connection' then
  if payload->>'status' not in ('accepted','declined') then raise exception 'Choose accept or decline.'; end if;
  update linklemon_private.connections c set status=payload->>'status' where c.id=(payload->>'id')::uuid and c.recipient=actor and c.status='pending' returning c.id into item;
  if item is null then raise exception 'Request is no longer available.'; end if;
  return jsonb_build_object('ok',true);
 elsif action='disconnect' then
  update linklemon_private.connections c set status='declined' where c.id=(payload->>'id')::uuid and (c.requester=actor or c.recipient=actor) returning c.id into item;
  if item is null then raise exception 'Connection unavailable.'; end if;
  return jsonb_build_object('ok',true);
 elsif action='audience' then
  return jsonb_build_object('groups',(select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name) order by g.name),'[]'::jsonb) from public.groups g where g.owner_id=actor or exists(select 1 from public.group_members m where m.group_id=g.id and m.user_id=actor and m.status in ('active','accepted','approved','member'))),
   'people',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(nullif(p.full_name,''),'Member'))),'[]'::jsonb) from linklemon_private.connections c join public.profiles p on p.id=case when c.requester=actor then c.recipient else c.requester end where (c.requester=actor or c.recipient=actor) and c.status='accepted'));
 elsif action='create_outing' then
  starts:=(payload->>'starts_at')::timestamptz; ends:=(payload->>'ends_at')::timestamptz; place_name:=trim(payload->>'place');
  if starts is null or ends is null or starts<now()-interval '5 minutes' or starts>now()+interval '7 days' or ends<=now() or ends<=starts or ends>starts+interval '8 hours' or place_name is null or length(place_name) not between 2 and 120 or length(coalesce(payload->>'message',''))>500 then raise exception 'Check the place and outing times.'; end if;
  select coalesce(array_agg(value::uuid),'{}'::uuid[]) into groups_selected from jsonb_array_elements_text(coalesce(payload->'groups','[]'));
  select coalesce(array_agg(value::uuid),'{}'::uuid[]) into people_selected from jsonb_array_elements_text(coalesce(payload->'people','[]'));
  if cardinality(groups_selected)+cardinality(people_selected) not between 1 and 30 then raise exception 'Select between 1 and 30 groups or connections.'; end if;
  if exists(select 1 from unnest(groups_selected) x where not exists(select 1 from public.groups g where g.id=x and (g.owner_id=actor or exists(select 1 from public.group_members m where m.group_id=g.id and m.user_id=actor and m.status in ('active','accepted','approved','member'))))) then raise exception 'You can only notify your active groups.' using errcode='42501'; end if;
  if exists(select 1 from unnest(people_selected) x where not exists(select 1 from linklemon_private.connections c where c.status='accepted' and ((c.requester=actor and c.recipient=x) or (c.recipient=actor and c.requester=x)))) then raise exception 'Choose accepted connections.' using errcode='42501'; end if;
  select array_agg(distinct id) into recipients from (
   select unnest(people_selected) id union select g.owner_id from public.groups g where g.id=any(groups_selected)
   union select m.user_id from public.group_members m where m.group_id=any(groups_selected) and m.status in ('active','accepted','approved','member')
  ) selected where id<>actor;
  if coalesce(cardinality(recipients),0) not between 1 and 100 then raise exception 'Choose an audience with 1 to 100 other people.'; end if;
  if (select count(*) from linklemon_private.outings o where o.owner_id=actor and o.created_at>now()-interval '1 hour')>=10 then raise exception 'Please wait before posting another outing.'; end if;
  insert into linklemon_private.outings(owner_id,place,message,starts_at,ends_at) values(actor,place_name,coalesce(payload->>'message',''),starts,ends) returning id into item;
  insert into linklemon_private.outing_recipients(outing_id,user_id) select item,unnest(recipients);
  insert into linklemon_private.social_notices(user_id,outing_id,kind,title) select unnest(recipients),item,'outing',actor_name||' is heading to '||place_name;
  return jsonb_build_object('id',item,'recipient_count',cardinality(recipients));
 elsif action='outings' or action='outing' then
  if action='outing' then item:=(payload->>'id')::uuid; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'place',o.place,'message',o.message,'starts_at',o.starts_at,'ends_at',o.ends_at,'cancelled_at',o.cancelled_at,'is_owner',o.owner_id=actor,'host',coalesce(nullif(p.full_name,''),'Member'),
   'going',coalesce((select r.going from linklemon_private.outing_recipients r where r.outing_id=o.id and r.user_id=actor),false),
   'attendees',(select coalesce(jsonb_agg(coalesce(nullif(pp.full_name,''),'Member')),'[]'::jsonb) from linklemon_private.outing_recipients r left join public.profiles pp on pp.id=r.user_id where r.outing_id=o.id and r.going)) order by o.starts_at),'[]'::jsonb) into result
   from linklemon_private.outings o left join public.profiles p on p.id=o.owner_id
   where (o.owner_id=actor or exists(select 1 from linklemon_private.outing_recipients r where r.outing_id=o.id and r.user_id=actor)) and ((action='outing' and o.id=item) or (action='outings' and o.ends_at>now() and o.cancelled_at is null));
  return result;
 elsif action='respond_outing' then
  item:=(payload->>'id')::uuid;
  perform 1 from linklemon_private.outings o where o.id=item and o.cancelled_at is null and o.ends_at>now() for update;
  if not found then raise exception 'This outing has ended or was cancelled.'; end if;
  select r.user_id into target from linklemon_private.outing_recipients r where r.outing_id=item and r.user_id=actor for update;
  if target is null then raise exception 'This outing is not shared with you.' using errcode='42501'; end if;
  if coalesce((payload->>'going')::boolean,false) and not (select r.going from linklemon_private.outing_recipients r where r.outing_id=item and r.user_id=actor) then
   insert into linklemon_private.social_notices(user_id,outing_id,kind,title) select o.owner_id,o.id,'joined',actor_name||' is joining you at '||o.place from linklemon_private.outings o where o.id=item;
  end if;
  update linklemon_private.outing_recipients set going=coalesce((payload->>'going')::boolean,false) where outing_id=item and user_id=actor;
  return jsonb_build_object('ok',true);
 elsif action='cancel_outing' then
  update linklemon_private.outings o set cancelled_at=now() where o.id=(payload->>'id')::uuid and o.owner_id=actor and o.cancelled_at is null and o.ends_at>now() returning o.id,o.place into item,place_name;
  if item is null then raise exception 'Outing is unavailable.'; end if;
  insert into linklemon_private.social_notices(user_id,outing_id,kind,title) select r.user_id,item,'cancelled','Outing to '||place_name||' was cancelled' from linklemon_private.outing_recipients r where r.outing_id=item;
  return jsonb_build_object('ok',true);
 elsif action='notices' then
  select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'outing_id',n.outing_id,'title',n.title,'kind',n.kind,'created_at',n.created_at) order by n.created_at desc),'[]'::jsonb) into result from linklemon_private.social_notices n join linklemon_private.outings o on o.id=n.outing_id where n.user_id=actor and n.read_at is null and o.ends_at>now() and (o.cancelled_at is null or n.kind='cancelled');
  return result;
 elsif action='read_notice' then
  update linklemon_private.social_notices set read_at=now() where id=(payload->>'id')::uuid and user_id=actor returning id into item;
  if item is null then raise exception 'Notification unavailable.'; end if;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown action.';
end; $$;
revoke all on function linklemon_private.social_action(text,jsonb) from public,anon;
grant execute on function linklemon_private.social_action(text,jsonb) to authenticated;
create function public.social_action(action text,payload jsonb default '{}'::jsonb) returns jsonb
 language sql security invoker set search_path='' as $$ select linklemon_private.social_action(action,payload); $$;
revoke all on function public.social_action(text,jsonb) from public,anon;
grant execute on function public.social_action(text,jsonb) to authenticated;
