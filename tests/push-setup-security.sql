begin;
insert into auth.sessions(id,user_id) values('10000000-0000-4000-8000-000000000099','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0');
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated","session_id":"10000000-0000-4000-8000-000000000099"}',true);
set local role authenticated;
select public.push_device('register','{"endpoint":"https://fcm.googleapis.com/fcm/send/rollback-setup","keys":{"p256dh":"BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","auth":"AAAAAAAAAAAAAAAAAAAAAA"}}');
do $$ begin
 if public.push_setup('status','https://fcm.googleapis.com/fcm/send/rollback-setup')->>'registered'<>'true' then raise exception 'Own device missing'; end if;
 if public.push_setup('status','https://fcm.googleapis.com/fcm/send/not-owned')->>'registered'<>'false' then raise exception 'Unknown endpoint exposed'; end if;
 perform public.push_setup('test','https://fcm.googleapis.com/fcm/send/rollback-setup');
 begin
 perform public.push_setup('test','https://fcm.googleapis.com/fcm/send/rollback-setup');
 raise exception 'Throttle failed';
 exception when raise_exception then if sqlerrm='Throttle failed' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from linklemon_private.push_jobs where source='test')<>1 then raise exception 'Wrong test count'; end if;
 if not linklemon_private.push_eligible((select id from linklemon_private.push_jobs where source='test')) then raise exception 'Test not eligible'; end if;
 update public.notification_preferences set paused_until=now()+interval '1 day' where user_id='d032a1a2-e77c-4f4a-8e8d-bde586bee5a0';
 if linklemon_private.push_eligible((select id from linklemon_private.push_jobs where source='test')) then raise exception 'Pause bypass'; end if;
 if has_function_privilege('anon','public.push_setup(text,text)','EXECUTE') then raise exception 'Anonymous grant'; end if;
end $$;
select 'Own-device registration, test queue, throttle, pause and anonymous denial passed' as result;
rollback;
