create or replace function linklemon_private.queue_notice_push() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; expiry timestamptz; host_name text; destination text;
begin
 if tg_table_name='social_notices' then
  select o.ends_at, coalesce(nullif(trim(p.full_name),''),'Someone in your circle'), o.place into expiry,host_name,destination from linklemon_private.outings o left join public.profiles p on p.id=o.owner_id where o.id=new.outing_id;
  perform linklemon_private.queue_push(new.user_id,'social',new.id,case new.kind when 'outing' then left(host_name,60)||' is heading out to '||left(destination,75)||'. Who’s in?' when 'joined' then 'Someone is joining your outing.' else 'An outing was cancelled.' end,'/outings/'||new.outing_id,expiry,new.kind='outing');
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
