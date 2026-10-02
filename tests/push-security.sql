begin;
-- All fixtures and claims below roll back; no provider is contacted.
insert into auth.sessions(id,user_id) values('10000000-0000-4000-8000-000000000001','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0');
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated","session_id":"10000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
select public.push_device('register','{"endpoint":"https://fcm.googleapis.com/fcm/send/linklemon-rollback-only","keys":{"p256dh":"BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","auth":"AAAAAAAAAAAAAAAAAAAAAA"}}');
reset role;
do $$ begin
 if has_function_privilege('authenticated','public.push_work(text,jsonb)','EXECUTE') or has_function_privilege('anon','public.push_device(text,jsonb)','EXECUTE') then raise exception 'RPC grant leak'; end if;
 if has_table_privilege('authenticated','linklemon_private.push_devices','SELECT') then raise exception 'Device privacy leak'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"53061c92-3410-4a4f-be3d-29370281630f","role":"authenticated"}',true);
insert into linklemon_private.connections(id,requester,recipient) values('20000000-0000-4000-8000-000000000001','53061c92-3410-4a4f-be3d-29370281630f','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare jobs jsonb; item jsonb; begin
 jobs:=public.push_work('claim','{}');
 if jsonb_array_length(jobs)<>1 then raise exception 'Expected one device alert'; end if;
 item:=jobs->0;
 if not (public.push_work('eligible',item)::text)::boolean then raise exception 'Expected eligible alert'; end if;
 if jsonb_array_length(public.push_work('claim','{}'))<>0 then raise exception 'Job claimed twice'; end if;
 update public.notification_preferences set paused_until=now()+interval '1 day' where user_id='d032a1a2-e77c-4f4a-8e8d-bde586bee5a0';
 if (public.push_work('eligible',item)::text)::boolean then raise exception 'Paused alert eligible'; end if;
 update public.notification_preferences set paused_until=null where user_id='d032a1a2-e77c-4f4a-8e8d-bde586bee5a0';
 if jsonb_array_length(public.push_work('claim','{}'))<>0 then raise exception 'Muted alert replayed'; end if;
end $$;
delete from linklemon_private.connections where id='20000000-0000-4000-8000-000000000001';
update public.notification_preferences set enabled=false where user_id='d032a1a2-e77c-4f4a-8e8d-bde586bee5a0';
insert into linklemon_private.connections(id,requester,recipient) values('20000000-0000-4000-8000-000000000002','53061c92-3410-4a4f-be3d-29370281630f','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0');
do $$ begin if (select count(*) from linklemon_private.push_jobs)<>1 then raise exception 'Off account queued an alert'; end if; end $$;
delete from linklemon_private.connections where id='20000000-0000-4000-8000-000000000002';
update public.notification_preferences set enabled=true where user_id='d032a1a2-e77c-4f4a-8e8d-bde586bee5a0';
insert into linklemon_private.connections(id,requester,recipient) values('20000000-0000-4000-8000-000000000003','53061c92-3410-4a4f-be3d-29370281630f','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0');
delete from auth.sessions where id='10000000-0000-4000-8000-000000000001';
do $$ begin if jsonb_array_length(public.push_work('claim','{}'))<>0 then raise exception 'Signed-out session got alerts'; end if; end $$;
select 'push privacy, pause, deduplication, no replay, off and sign-out checks passed' as result;
rollback;
