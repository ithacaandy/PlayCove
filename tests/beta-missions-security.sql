-- Entire test uses generated fixture accounts and rolls back, including notification jobs.
begin;
select set_config('test.beta_host',gen_random_uuid()::text,true),set_config('test.beta_member',gen_random_uuid()::text,true),set_config('test.beta_stranger',gen_random_uuid()::text,true),set_config('test.beta_group',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at) values
 (current_setting('test.beta_host')::uuid,'beta-mission-host-'||current_setting('test.beta_host')||'@example.invalid',now()),
 (current_setting('test.beta_member')::uuid,'beta-mission-member-'||current_setting('test.beta_member')||'@example.invalid',now()),
 (current_setting('test.beta_stranger')::uuid,'beta-mission-stranger-'||current_setting('test.beta_stranger')||'@example.invalid',now());
insert into linklemon_private.beta_testers(email) select email from auth.users where id in (current_setting('test.beta_host')::uuid,current_setting('test.beta_member')::uuid,current_setting('test.beta_stranger')::uuid);
insert into public.groups(id,name,owner_id) values(current_setting('test.beta_group')::uuid,'Rollback beta mission group',current_setting('test.beta_host')::uuid);
insert into public.group_members(group_id,user_id,role,status) values(current_setting('test.beta_group')::uuid,current_setting('test.beta_member')::uuid,'member','active');
insert into linklemon_private.connections(requester,recipient,status) values(current_setting('test.beta_host')::uuid,current_setting('test.beta_member')::uuid,'accepted');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.beta_host'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.beta_host'),'role','authenticated')::text,true);
do $$ declare r jsonb; i integer; begin
 r:=public.beta_mission_action('status');
 if r->'mission'<>'null'::jsonb then raise exception 'Mission unlocked before welcome'; end if;
 begin perform public.beta_mission_action('welcome_complete'); raise exception 'Early welcome completion accepted'; exception when raise_exception then if sqlerrm='Early welcome completion accepted' then raise; end if; end;
 perform public.beta_mission_action('welcome_skip');
 if public.beta_mission_action('status')->'mission'<>'null'::jsonb then raise exception 'Skip unlocked mission'; end if;
 begin perform public.beta_mission_action('start'); raise exception 'Started before welcome'; exception when raise_exception then if sqlerrm='Started before welcome' then raise; end if; end;
 for i in 0..3 loop perform public.beta_mission_action('welcome_next',jsonb_build_object('step',i)); end loop;
 begin perform public.beta_mission_action('welcome_next','{"step":0}'); raise exception 'Stale device overwrote progress'; exception when raise_exception then if sqlerrm='Stale device overwrote progress' then raise; end if; end;
 perform public.beta_mission_action('welcome_back','{"step":4}'); perform public.beta_mission_action('welcome_next','{"step":3}');
 r:=public.beta_mission_action('welcome_complete');
 if r->'mission'->>'assignedAt' is null then raise exception 'Completion did not assign mission'; end if;
 perform set_config('test.beta_assigned',r->'mission'->>'assignedAt',true);
 if public.beta_mission_action('welcome_complete')->'mission'->>'assignedAt'<>current_setting('test.beta_assigned') then raise exception 'Repeat completion reset assignment'; end if;
 perform public.beta_mission_action('start');
 perform public.beta_mission_action('defer');
 if public.beta_mission_action('status')->'mission'->>'completedAt' is not null then raise exception 'Defer completed mission'; end if;
 perform public.beta_mission_action('feedback','{"rating":"blocked","message":"Rollback-only feedback"}');
 if public.beta_mission_action('status')->'mission'->>'feedbackCount'<>'1' then raise exception 'Feedback missing'; end if;
 begin perform public.beta_tester_dashboard(); raise exception 'Non-admin saw dashboard'; exception when insufficient_privilege then null; end;
 begin perform 1 from linklemon_private.beta_progress; raise exception 'Private table exposed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('test.beta_direct',public.social_action('create_outing',jsonb_build_object('place','Rollback connection-only park','starts_at',now(),'ends_at',now()+interval '1 hour','people',jsonb_build_array(current_setting('test.beta_member'))))->>'id',true);
select set_config('request.jwt.claim.sub',current_setting('test.beta_member'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.beta_member'),'role','authenticated')::text,true);
select public.social_action('respond_outing',jsonb_build_object('id',current_setting('test.beta_direct'),'going',true));
select set_config('request.jwt.claim.sub',current_setting('test.beta_host'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.beta_host'),'role','authenticated')::text,true);
do $$ begin if public.beta_mission_action('status')->'mission'->>'completedAt' is not null then raise exception 'Connection-only response counted as group mission'; end if; end $$;
select set_config('test.beta_outing',public.social_action('create_outing',jsonb_build_object('place','Rollback mission park','starts_at',now(),'ends_at',now()+interval '1 hour','groups',jsonb_build_array(current_setting('test.beta_group'))))->>'id',true);
do $$ begin
 if public.beta_mission_action('status')->'mission'->'outing'->>'id'<>current_setting('test.beta_outing') then raise exception 'Group outing was not recorded'; end if;
 if public.beta_mission_action('status')->'mission'->>'completedAt' is not null then raise exception 'Sharing alone completed mission'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.beta_stranger'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.beta_stranger'),'role','authenticated')::text,true);
do $$ begin
 if public.beta_mission_action('status')->'mission'<>'null'::jsonb then raise exception 'Cross-user progress exposed'; end if;
 begin perform public.social_action('respond_outing',jsonb_build_object('id',current_setting('test.beta_outing'),'going',true)); raise exception 'Unselected response accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.beta_member'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.beta_member'),'role','authenticated')::text,true);
-- A decline is a real response and must count, even though going remains false.
select public.social_action('respond_outing',jsonb_build_object('id',current_setting('test.beta_outing'),'going',false));
select set_config('request.jwt.claim.sub',current_setting('test.beta_host'),true),set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.beta_host'),'role','authenticated')::text,true);
do $$ declare finished text; begin
 finished:=public.beta_mission_action('status')->'mission'->>'completedAt';
 if finished is null then raise exception 'Group decline did not complete mission'; end if;
 perform public.beta_mission_action('start');
 if public.beta_mission_action('status')->'mission'->>'completedAt'<>finished then raise exception 'Restart erased completion'; end if;
end $$;
reset role;
-- Dashboard is allowed only for an existing admin (fixture grant disappears on rollback).
insert into public.admins(user_id) values(current_setting('test.beta_host')::uuid);
set local role authenticated;
do $$ begin if not exists(select 1 from jsonb_array_elements(public.beta_tester_dashboard()) t where t->>'userId'=current_setting('test.beta_host') and t->>'completedAt' is not null) then raise exception 'Admin summary missing completion'; end if; end $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true),set_config('request.jwt.claims','{"role":"authenticated"}',true);
do $$ begin begin perform public.beta_mission_action('status'); raise exception 'Non-beta identity accepted'; exception when insufficient_privilege then null; end; end $$;
set local role anon;
do $$ begin begin perform public.beta_mission_action('status'); raise exception 'Anonymous read accepted'; exception when insufficient_privilege then null; end; end $$;
reset role;
do $$ begin
 if has_table_privilege('authenticated','linklemon_private.beta_mission_feedback','INSERT') then raise exception 'Direct feedback write exposed'; end if;
 if has_function_privilege('anon','public.beta_tester_dashboard()','EXECUTE') then raise exception 'Anonymous dashboard exposed'; end if;
end $$;
select 'welcome gate, skip, stale-device guard, durable assignment, feedback, group decline completion, account isolation and admin denial passed; rollback only' as result;
rollback;
