-- Wake the existing signed dispatcher for email-only work too.
create or replace function linklemon_private.wake_push_dispatch() returns void language plpgsql security definer set search_path='' as $$
declare dispatch_secret text; stamp bigint:=floor(extract(epoch from clock_timestamp())); nonce_value uuid:=gen_random_uuid(); signature text;
begin
 if not exists(select 1 from linklemon_private.push_dispatch_config where enabled) then return; end if;
 if not exists(select 1 from linklemon_private.push_jobs where status in ('pending','working') and due_at<=now() and expires_at>now())
 and not exists(select 1 from linklemon_private.email_jobs where status in ('pending','working') and due_at<=now() and expires_at>now()) then return; end if;
 select decrypted_secret into dispatch_secret from vault.decrypted_secrets where name='linklemon_push_dispatch_secret' limit 1;
 if dispatch_secret is null or length(dispatch_secret)<32 then return; end if;
 update linklemon_private.push_dispatch_config set last_wake_at=clock_timestamp() where singleton and enabled and last_wake_at<clock_timestamp()-interval '5 seconds';
 if not found then return; end if;
 signature:=encode(extensions.hmac(convert_to(stamp::text||':'||nonce_value::text||':linklemon-push-dispatch-v1','UTF8'),convert_to(dispatch_secret,'UTF8'),'sha256'),'hex');
 perform net.http_post(url:='https://getlinklemon.com/api/push/dispatch',body:=jsonb_build_object('timestamp',stamp,'nonce',nonce_value,'signature',signature),headers:=jsonb_build_object('Content-Type','application/json'),timeout_milliseconds:=60000);
exception when others then raise log 'LinkLemon push wake-up deferred';
end $$;
revoke all on function linklemon_private.wake_push_dispatch() from public,anon,authenticated;

create trigger wake_email_after_insert after insert on linklemon_private.email_jobs for each statement execute function linklemon_private.wake_push_after_insert();
