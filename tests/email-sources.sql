select set_config('request.jwt.claim.sub','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0',true);
select set_config('request.jwt.claims','{"sub":"d032a1a2-e77c-4f4a-8e8d-bde586bee5a0","role":"authenticated"}',true);
select public.email_settings('enable');
select set_config('request.jwt.claim.sub','53061c92-3410-4a4f-be3d-29370281630f',true);
select set_config('request.jwt.claims','{"sub":"53061c92-3410-4a4f-be3d-29370281630f","role":"authenticated"}',true);
insert into public.groups(id,name,owner_id) values('99999999-eeee-4eee-8eee-444444444444','Email rollback group','53061c92-3410-4a4f-be3d-29370281630f');
insert into public.group_invites(id,group_id,email,token,invited_by) values('99999999-eeee-4eee-8eee-555555555555','99999999-eeee-4eee-8eee-444444444444','abn48@cornell.edu',repeat('b',64),'53061c92-3410-4a4f-be3d-29370281630f');
insert into public.events(id,owner_id,title,date_iso,start_time,location_name,city) values('99999999-eeee-4eee-8eee-666666666666','53061c92-3410-4a4f-be3d-29370281630f','Email rollback event',current_date+1,'16:00','Test park','Ithaca');
insert into public.event_invites(id,event_id,email,token,invited_by) values('99999999-eeee-4eee-8eee-777777777777','99999999-eeee-4eee-8eee-666666666666','abn48@cornell.edu',repeat('c',64),'53061c92-3410-4a4f-be3d-29370281630f');
insert into public.event_notifications(id,user_id,event_id,event_title,kind) values('99999999-eeee-4eee-8eee-888888888888','d032a1a2-e77c-4f4a-8e8d-bde586bee5a0','99999999-eeee-4eee-8eee-666666666666','Email rollback event','cancelled');
do $$begin
 if (select count(*) from linklemon_private.email_jobs where source in ('group_invites','event_invites','event_update'))<>3 then raise exception 'Invitation or event triggers failed';end if;
 if exists(select 1 from linklemon_private.email_jobs where source in ('group_invites','event_invites','event_update') and not linklemon_private.email_eligible(id)) then raise exception 'Invitation or event jobs ineligible';end if;
end $$;
update public.group_invites set status='revoked' where id='99999999-eeee-4eee-8eee-555555555555';
update public.event_invites set status='revoked' where id='99999999-eeee-4eee-8eee-777777777777';
do $$begin if exists(select 1 from linklemon_private.email_jobs where source in ('group_invites','event_invites') and linklemon_private.email_eligible(id)) then raise exception 'Revoked invitation still eligible';end if;end $$;
select 'Group invitation, event invitation, event update and revoked-invitation guards passed (rollback only)' as result;
