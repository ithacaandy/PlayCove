-- Additive beta onboarding and mission tracking. Apply once as linklemon_beta_missions.
create table linklemon_private.beta_progress (
 user_id uuid primary key references auth.users(id), welcome_step integer not null default 0 check(welcome_step between 0 and 4),
 welcome_imported_at timestamptz, welcome_completed_at timestamptz, welcome_skipped_at timestamptz, last_activity_at timestamptz not null default now()
);
create table linklemon_private.beta_mission_progress (
 user_id uuid not null references auth.users(id), mission_key text not null check(mission_key='heading_out_group'),
 assigned_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz, deferred_at timestamptz,
 last_activity_at timestamptz not null default now(), primary key(user_id,mission_key)
);
create table linklemon_private.beta_mission_outings (
 outing_id uuid primary key references linklemon_private.outings(id), user_id uuid not null references auth.users(id),
 mission_key text not null default 'heading_out_group', group_recipients uuid[] not null,
 shared_at timestamptz not null default now(), responded_at timestamptz,
 foreign key(user_id,mission_key) references linklemon_private.beta_mission_progress(user_id,mission_key)
);
create index beta_mission_outings_user on linklemon_private.beta_mission_outings(user_id,shared_at desc);
create table linklemon_private.beta_mission_feedback (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 mission_key text not null default 'heading_out_group', rating text not null check(rating in ('easy','confusing','blocked')),
 message text not null default '' check(length(message)<=2000), created_at timestamptz not null default now(),
 foreign key(user_id,mission_key) references linklemon_private.beta_mission_progress(user_id,mission_key)
);
create index beta_mission_feedback_user on linklemon_private.beta_mission_feedback(user_id,created_at desc);
alter table linklemon_private.beta_progress enable row level security;
alter table linklemon_private.beta_mission_progress enable row level security;
alter table linklemon_private.beta_mission_outings enable row level security;
alter table linklemon_private.beta_mission_feedback enable row level security;
revoke all on linklemon_private.beta_progress,linklemon_private.beta_mission_progress,linklemon_private.beta_mission_outings,linklemon_private.beta_mission_feedback from public,anon,authenticated;

-- Private definer entrypoints require the authenticated caller and never accept a user ID.
create function linklemon_private.beta_mission_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p linklemon_private.beta_progress; m linklemon_private.beta_mission_progress; latest jsonb; feedback_count integer;
begin
 if actor is null or not linklemon_private.beta_allowed() or not exists(select 1 from linklemon_private.beta_testers b join auth.users u on lower(u.email)=lower(b.email) where u.id=actor and not coalesce(u.is_anonymous,false)) then
  raise exception 'Beta access is required.' using errcode='42501';
 end if;
 if action not in ('status','welcome_next','welcome_back','welcome_skip','welcome_complete','welcome_import','start','defer','feedback') then raise exception 'Invalid action.'; end if;
 insert into linklemon_private.beta_progress(user_id) values(actor) on conflict do nothing;
 select * into p from linklemon_private.beta_progress where user_id=actor for update;
 if action in ('welcome_next','welcome_back') then
  if (payload->>'step')::integer is distinct from p.welcome_step then raise exception 'Setup changed on another device. Refresh and try again.'; end if;
  if p.welcome_completed_at is null then
   update linklemon_private.beta_progress set welcome_imported_at=coalesce(welcome_imported_at,now()),welcome_step=greatest(0,least(4,welcome_step+case when action='welcome_next' then 1 else -1 end)),last_activity_at=now() where user_id=actor;
  end if;
 elsif action='welcome_skip' then
  update linklemon_private.beta_progress set welcome_skipped_at=now(),last_activity_at=now() where user_id=actor;
 elsif action='welcome_import' then
  -- Preserve existing browser step once; old local completion still requires final confirmation.
  if p.welcome_step=0 and p.welcome_imported_at is null and p.welcome_completed_at is null and (payload->>'step')::integer between 0 and 4 then
   update linklemon_private.beta_progress set welcome_imported_at=now(),welcome_step=(payload->>'step')::integer,last_activity_at=now() where user_id=actor;
  end if;
 elsif action='welcome_complete' then
  if p.welcome_step<>4 then raise exception 'Finish the five welcome steps first.'; end if;
  update linklemon_private.beta_progress set welcome_completed_at=coalesce(welcome_completed_at,now()),last_activity_at=now() where user_id=actor;
 end if;
 select * into p from linklemon_private.beta_progress where user_id=actor;
 if p.welcome_completed_at is not null then
  insert into linklemon_private.beta_mission_progress(user_id,mission_key) values(actor,'heading_out_group') on conflict do nothing;
 elsif action in ('start','defer','feedback') then raise exception 'Finish Welcome before starting a mission.';
 end if;
 if action='start' then
  update linklemon_private.beta_mission_progress set started_at=coalesce(started_at,now()),deferred_at=null,last_activity_at=now() where user_id=actor;
 elsif action='defer' then
  update linklemon_private.beta_mission_progress set deferred_at=now(),last_activity_at=now() where user_id=actor and completed_at is null;
 elsif action='feedback' then
  if coalesce(payload->>'rating','') not in ('easy','confusing','blocked') or length(coalesce(payload->>'message',''))>2000 then raise exception 'Check your feedback.'; end if;
  if (select count(*) from linklemon_private.beta_mission_feedback where user_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Please wait before sending more feedback.'; end if;
  insert into linklemon_private.beta_mission_feedback(user_id,rating,message) values(actor,payload->>'rating',trim(coalesce(payload->>'message','')));
  update linklemon_private.beta_mission_progress set last_activity_at=now() where user_id=actor;
 end if;
 if action<>'status' then update linklemon_private.beta_progress set last_activity_at=now() where user_id=actor; end if;
 select * into m from linklemon_private.beta_mission_progress where user_id=actor;
 select jsonb_build_object('id',o.outing_id,'sharedAt',o.shared_at,'respondedAt',o.responded_at,'cancelled',x.cancelled_at is not null,'ended',x.ends_at<=now()) into latest
 from linklemon_private.beta_mission_outings o join linklemon_private.outings x on x.id=o.outing_id where o.user_id=actor order by o.shared_at desc limit 1;
 select count(*) into feedback_count from linklemon_private.beta_mission_feedback where user_id=actor;
 return jsonb_build_object('welcome',jsonb_build_object('step',p.welcome_step,'completedAt',p.welcome_completed_at,'skippedAt',p.welcome_skipped_at),
  'mission',case when m.user_id is null then null else jsonb_build_object('key',m.mission_key,'assignedAt',m.assigned_at,'startedAt',m.started_at,'completedAt',m.completed_at,'deferredAt',m.deferred_at,'outing',latest,'feedbackCount',feedback_count) end);
end; $$;
revoke all on function linklemon_private.beta_mission_action(text,jsonb) from public,anon,authenticated;
grant execute on function linklemon_private.beta_mission_action(text,jsonb) to authenticated;
create function public.beta_mission_action(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select linklemon_private.beta_mission_action(action,payload)$$;
revoke all on function public.beta_mission_action(text,jsonb) from public,anon,authenticated;
grant execute on function public.beta_mission_action(text,jsonb) to authenticated;

-- Keep the existing social operation intact and record evidence in the same transaction.
create function linklemon_private.beta_social_action(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; actor uuid:=auth.uid(); item uuid; group_people uuid[];
begin
 result:=linklemon_private.social_action(action,payload);
 if action='create_outing' and exists(select 1 from linklemon_private.beta_mission_progress where user_id=actor and completed_at is null) then
  item:=(result->>'id')::uuid;
  select coalesce(array_agg(distinct selected.user_id),'{}'::uuid[]) into group_people from (
   select g.owner_id user_id from public.groups g where g.id in (select value::uuid from jsonb_array_elements_text(coalesce(payload->'groups','[]')))
   union select gm.user_id from public.group_members gm where gm.group_id in (select value::uuid from jsonb_array_elements_text(coalesce(payload->'groups','[]'))) and gm.status in ('active','accepted','approved','member')
  ) selected where selected.user_id<>actor and exists(select 1 from linklemon_private.outing_recipients r where r.outing_id=item and r.user_id=selected.user_id);
  if cardinality(group_people)>0 then
   insert into linklemon_private.beta_mission_outings(outing_id,user_id,group_recipients) values(item,actor,group_people);
   update linklemon_private.beta_mission_progress set started_at=coalesce(started_at,now()),deferred_at=null,last_activity_at=now() where user_id=actor;
   update linklemon_private.beta_progress set last_activity_at=now() where user_id=actor;
  end if;
 elsif action='respond_outing' then
  item:=(payload->>'id')::uuid;
  update linklemon_private.beta_mission_outings set responded_at=coalesce(responded_at,now()) where outing_id=item and actor=any(group_recipients);
  update linklemon_private.beta_mission_progress m set completed_at=coalesce(m.completed_at,now()),last_activity_at=now()
   from linklemon_private.beta_mission_outings o where o.outing_id=item and o.responded_at is not null and m.user_id=o.user_id and m.mission_key=o.mission_key;
  update linklemon_private.beta_progress p set last_activity_at=now() from linklemon_private.beta_mission_outings o where o.outing_id=item and o.responded_at is not null and p.user_id=o.user_id;
 end if;
 return result;
end; $$;
revoke all on function linklemon_private.beta_social_action(text,jsonb) from public,anon,authenticated;
grant execute on function linklemon_private.beta_social_action(text,jsonb) to authenticated;
create or replace function public.social_action(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select linklemon_private.beta_social_action(action,payload)$$;

create function linklemon_private.beta_tester_dashboard() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not linklemon_private.beta_allowed() or not exists(select 1 from public.admins where user_id=auth.uid()) then raise exception 'Admin access is required.' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('userId',u.id,'name',coalesce(nullif(pr.full_name,''),b.email),'email',b.email,
 'welcomeStep',p.welcome_step,'welcomeCompletedAt',p.welcome_completed_at,'assignedAt',m.assigned_at,'startedAt',m.started_at,'completedAt',m.completed_at,'deferredAt',m.deferred_at,
 'lastActivityAt',greatest(p.last_activity_at,m.last_activity_at),'outingsShared',(select count(*) from linklemon_private.beta_mission_outings o where o.user_id=u.id),
 'feedback',(select coalesce(jsonb_agg(jsonb_build_object('rating',f.rating,'message',f.message,'createdAt',f.created_at) order by f.created_at desc),'[]'::jsonb) from linklemon_private.beta_mission_feedback f where f.user_id=u.id)) order by b.email),'[]'::jsonb)
 from linklemon_private.beta_testers b left join auth.users u on lower(u.email)=lower(b.email) left join public.profiles pr on pr.id=u.id
 left join linklemon_private.beta_progress p on p.user_id=u.id left join linklemon_private.beta_mission_progress m on m.user_id=u.id);
end; $$;
revoke all on function linklemon_private.beta_tester_dashboard() from public,anon,authenticated;
grant execute on function linklemon_private.beta_tester_dashboard() to authenticated;
create function public.beta_tester_dashboard() returns jsonb language sql security invoker set search_path='' as $$select linklemon_private.beta_tester_dashboard()$$;
revoke all on function public.beta_tester_dashboard() from public,anon,authenticated;
grant execute on function public.beta_tester_dashboard() to authenticated;
