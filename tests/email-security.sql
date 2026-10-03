-- Run after the proposed email schema inside a single BEGIN/ROLLBACK transaction.
set local role authenticated;
select set_config('request.jwt.claim.sub','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0',true);
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated"}',true);
do $$begin
 if (public.email_settings('get')->>'enabled')::boolean then raise exception 'Email opted in by default'; end if;
 perform public.email_settings('enable');
 begin perform public.email_work('claim');raise exception 'Client claimed email jobs';exception when insufficient_privilege then null;end;
 begin perform public.email_unsubscribe(repeat('a',64));raise exception 'Client called privileged unsubscribe';exception when insufficient_privilege then null;end;
 begin perform count(*) from linklemon_private.email_preferences;raise exception 'Client read private preferences';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into linklemon_private.outings(id,owner_id,place,starts_at,ends_at) values('99999999-eeee-4eee-8eee-111111111111','53061c92-3410-4a4f-be3d-29370281630f','Email rollback test park',now(),now()+interval '1 hour');
insert into linklemon_private.social_notices(id,user_id,outing_id,kind,title) values('99999999-eeee-4eee-8eee-222222222222','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0','99999999-eeee-4eee-8eee-111111111111','outing','Rollback only');
do $$declare job uuid;begin
 select id into job from linklemon_private.email_jobs where source_id='99999999-eeee-4eee-8eee-222222222222';
 if job is null or not linklemon_private.email_eligible(job) then raise exception 'Eligible outing not queued';end if;
 perform set_config('test.email_job',job::text,true);
 if not exists(select 1 from linklemon_private.email_jobs where id=job and subject like '% is heading out to Email rollback test park' and body like '%Eastern Time%') then raise exception 'Outing wording failed';end if;
end $$;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare claimed jsonb;begin
 claimed:=public.email_work('claim');
 if jsonb_array_length(claimed)<>1 then raise exception 'Queue claim failed';end if;
 if public.email_work('eligible',jsonb_build_object('id',claimed->0->>'id','lease','99999999-eeee-4eee-8eee-333333333333'))='true'::jsonb then raise exception 'Wrong lease authorized';end if;
 if public.email_work('eligible',jsonb_build_object('id',claimed->0->>'id','lease',claimed->0->>'lease'))<>'true'::jsonb then raise exception 'Claim ineligible';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated"}',true);
select public.email_settings('pause',jsonb_build_object('until',now()+interval '1 day'));
reset role;
do $$begin
 if linklemon_private.email_eligible(current_setting('test.email_job')::uuid) then raise exception 'Pause still eligible';end if;
 if not exists(select 1 from linklemon_private.email_jobs where id=current_setting('test.email_job')::uuid and status='skipped') then raise exception 'Pause failed to discard';end if;
end $$;
set local role authenticated;
select public.email_settings('resume');
select public.email_settings('heading_out','{"enabled":false}');
reset role;
insert into linklemon_private.social_notices(user_id,outing_id,kind,title) values('d032a1a2-e77c-4f4a-8e8d-bde586bee5a0','99999999-eeee-4eee-8eee-111111111111','joined','Rollback suppressed heading out');
do $$begin if (select count(*) from linklemon_private.email_jobs)<>1 then raise exception 'Heading out exclusion ignored';end if;end $$;
select set_config('test.unsubscribe',(select unsubscribe_token from linklemon_private.email_preferences where user_id='d032a1a2-e77c-4f4a-8e8d-bde586bee5a0'),true);
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.email_unsubscribe(current_setting('test.unsubscribe'));
select public.email_unsubscribe(current_setting('test.unsubscribe'));
reset role;
do $$begin if exists(select 1 from linklemon_private.email_preferences where user_id='d032a1a2-e77c-4f4a-8e8d-bde586bee5a0' and enabled) then raise exception 'Unsubscribe failed';end if;end $$;
set local role anon;
do $$begin
 begin perform public.email_settings('enable');raise exception 'Anonymous opted in';exception when insufficient_privilege then null;end;
 begin perform public.email_work('claim');raise exception 'Anonymous claimed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000123',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000123","role":"authenticated","email":"ithaca.andy@gmail.com"}',true);
do $$begin begin perform public.email_settings('enable');raise exception 'Forged account opted in';exception when insufficient_privilege then null;end;end $$;
reset role;
select 'Email opt-in, queue, wording, lease, pause, heading-out exclusion, unsubscribe and role guards passed (rollback only)' as result;
