begin;
-- Run inside BEGIN/ROLLBACK after installing the proposed schema in the same transaction.
-- Uses only the two approved beta accounts. No durable requests, outings or notifications.
set local role authenticated;
select set_config('request.jwt.claim.sub','53061c92-3410-4a4f-be3d-29370281630f',true);
select set_config('request.jwt.claims','{"sub":"53061c92-3410-4a4f-be3d-29370281630f","role":"authenticated"}',true);
select public.social_action('request_connection','{"email":"abn48@cornell.edu"}');
do $$ begin
 if jsonb_array_length(public.social_action('connections'))<>1 then raise exception 'Request missing'; end if;
 begin
  perform public.social_action('create_outing',jsonb_build_object('place','Rollback test park','starts_at',now(),'ends_at',now()+interval '1 hour','people',jsonb_build_array('d032a1a2-e77c-4f4a-8e8d-bde586bee5a0')));
  raise exception 'Unaccepted connection permitted';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0',true);
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated"}',true);
select public.social_action('respond_connection',jsonb_build_object('id',public.social_action('connections')->0->>'id','status','accepted'));
select set_config('request.jwt.claim.sub','53061c92-3410-4a4f-be3d-29370281630f',true);
select set_config('request.jwt.claims','{"sub":"53061c92-3410-4a4f-be3d-29370281630f","role":"authenticated"}',true);
select public.social_action('create_outing',jsonb_build_object('place','Rollback test park','starts_at',now(),'ends_at',now()+interval '1 hour','people',jsonb_build_array('d032a1a2-e77c-4f4a-8e8d-bde586bee5a0','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0')));
do $$ begin
 if jsonb_array_length(public.social_action('outings'))<>1 then raise exception 'Host outing missing'; end if;
 begin perform public.social_action('respond_outing',jsonb_build_object('id',public.social_action('outings')->0->>'id','going',true));
 raise exception 'Host accepted as recipient'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0',true);
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated"}',true);
do $$ declare plan uuid; begin
 if jsonb_array_length(public.social_action('notices'))<>1 then raise exception 'Dedup notice failed'; end if;
 plan:=(public.social_action('outings')->0->>'id')::uuid;
 perform public.social_action('respond_outing',jsonb_build_object('id',plan,'going',true));
 perform public.social_action('respond_outing',jsonb_build_object('id',plan,'going',true));
 if jsonb_array_length(public.social_action('outings')->0->'attendees')<>1 then raise exception 'Join missing'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000123',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000123","role":"authenticated","email":"ithaca.andy@gmail.com"}',true);
do $$ begin begin perform public.social_action('outings'); raise exception 'Unapproved user permitted'; exception when insufficient_privilege then null; end; end $$;
select set_config('request.jwt.claim.sub','53061c92-3410-4a4f-be3d-29370281630f',true);
select set_config('request.jwt.claims','{"sub":"53061c92-3410-4a4f-be3d-29370281630f","role":"authenticated"}',true);
do $$ declare plan uuid; begin
 if jsonb_array_length(public.social_action('notices'))<>1 then raise exception 'Repeated join sent duplicate notice'; end if;
 plan:=(public.social_action('outings')->0->>'id')::uuid;
 perform public.social_action('cancel_outing',jsonb_build_object('id',plan));
 if jsonb_array_length(public.social_action('outings'))<>0 then raise exception 'Cancelled outing remains active'; end if;
 begin perform public.social_action('respond_outing',jsonb_build_object('id',plan,'going',true));
 raise exception 'Cancelled join permitted'; exception when raise_exception then if sqlerrm='Cancelled join permitted' then raise; end if; end;
end $$;
set local role anon;
do $$ begin begin perform public.social_action('outings'); raise exception 'Anon permitted'; exception when insufficient_privilege then null; end; end $$;
reset role;
select 'connection consent, recipient deduplication, participation, cancellation, beta and anon guards passed; rollback only' as result;

rollback;
begin;
insert into linklemon_private.outings(id,owner_id,place,starts_at,ends_at) values('99999999-1111-4111-8111-111111111111','53061c92-3410-4a4f-be3d-29370281630f','Private isolation test',now(),now()+interval '1 hour');
insert into linklemon_private.social_notices(user_id,outing_id,kind,title) values('53061c92-3410-4a4f-be3d-29370281630f','99999999-1111-4111-8111-111111111111','joined','Rollback only');
select set_config('test.private_notice',(select id::text from linklemon_private.social_notices where outing_id='99999999-1111-4111-8111-111111111111'),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0',true);
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated"}',true);
do $$ begin
 if jsonb_array_length(public.social_action('outing','{"id":"99999999-1111-4111-8111-111111111111"}'))<>0 then raise exception 'Unselected approved account read private outing'; end if;
 begin perform public.social_action('respond_outing','{"id":"99999999-1111-4111-8111-111111111111","going":true}'); raise exception 'Unselected response permitted'; exception when insufficient_privilege then null; end;
 begin perform public.social_action('read_notice',jsonb_build_object('id',current_setting('test.private_notice')));raise exception 'Cross-user notice mark permitted'; exception when raise_exception then if sqlerrm='Cross-user notice mark permitted' then raise; end if; end;
 begin perform 1 from linklemon_private.outings;raise exception 'Direct private table read permitted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update linklemon_private.outings set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id='99999999-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub','53061c92-3410-4a4f-be3d-29370281630f',true);
select set_config('request.jwt.claims','{"sub":"53061c92-3410-4a4f-be3d-29370281630f","role":"authenticated"}',true);
do $$ begin
 if jsonb_array_length(public.social_action('outings'))<>0 then raise exception 'Expired outing active'; end if;
 if jsonb_array_length(public.social_action('notices'))<>0 then raise exception 'Expired notice active'; end if;
end $$;
select 'audience isolation, cross-user notice guard, private table grants, expiry passed' as result;
rollback;

begin;
insert into public.groups(id,name,owner_id,is_discoverable) values('99999999-2222-4222-8222-222222222222','Rollback-only audience fixture','53061c92-3410-4a4f-be3d-29370281630f',false);
insert into public.group_members(group_id,user_id,role,status) values('99999999-2222-4222-8222-222222222222','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0','member','active');
insert into linklemon_private.connections(requester,recipient,status) values('53061c92-3410-4a4f-be3d-29370281630f','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0','accepted');
set local role authenticated;
select set_config('request.jwt.claim.sub','53061c92-3410-4a4f-be3d-29370281630f',true);
select set_config('request.jwt.claims','{"sub":"53061c92-3410-4a4f-be3d-29370281630f","role":"authenticated"}',true);
do $$ declare result jsonb; begin
 result:=public.social_action('create_outing',jsonb_build_object('place','Audience rollback test','starts_at',now(),'ends_at',now()+interval '1 hour','groups',jsonb_build_array('99999999-2222-4222-8222-222222222222'),'people',jsonb_build_array('d032a1a2-e77c-4f4a-8e8d-bde586bee5a0')));
 if (result->>'recipient_count')::int<>1 then raise exception 'Mixed group/direct audience not deduplicated'; end if;
end $$;
reset role;
update public.group_members set status='pending' where group_id='99999999-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claim.sub','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0',true);
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated"}',true);
do $$ begin
 if jsonb_array_length(public.social_action('notices'))<>1 then raise exception 'Mixed audience duplicate notice'; end if;
 begin perform public.social_action('create_outing',jsonb_build_object('place','Unauthorized group test','starts_at',now(),'ends_at',now()+interval '1 hour','groups',jsonb_build_array('99999999-2222-4222-8222-222222222222')));
 raise exception 'Pending member posted'; exception when insufficient_privilege then null; end;
end $$;
select 'mixed group/direct audience deduplication and pending membership denial passed' as result;
rollback;
