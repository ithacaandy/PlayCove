create extension if not exists pg_net with schema extensions;
create table linklemon_private.push_dispatch_config (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 last_wake_at timestamptz not null default '-infinity'
);
insert into linklemon_private.push_dispatch_config(singleton) values(true);
alter table linklemon_private.push_dispatch_config enable row level security;
revoke all on linklemon_private.push_dispatch_config from public,anon,authenticated;
create function linklemon_private.wake_push_dispatch() returns void language plpgsql security definer set search_path='' as $$
declare dispatch_secret text;
begin
 if not exists(select 1 from linklemon_private.push_dispatch_config where enabled) then return; end if;
 if not exists(select 1 from linklemon_private.push_jobs where status in ('pending','working') and due_at<=now() and expires_at>now()) then return; end if;
 select decrypted_secret into dispatch_secret from vault.decrypted_secrets where name='linklemon_push_dispatch_secret' limit 1;
 if dispatch_secret is null or length(dispatch_secret)<32 then return; end if;
 update linklemon_private.push_dispatch_config set last_wake_at=clock_timestamp() where singleton and enabled and last_wake_at<clock_timestamp()-interval '5 seconds';
 if not found then return; end if;
 perform net.http_post(url:='https://getlinklemon.com/api/push/dispatch',body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||dispatch_secret),timeout_milliseconds:=60000);
exception when others then
 -- Preserve the outing/invitation transaction. The next scheduled tick retries the wake-up.
 raise log 'LinkLemon push wake-up deferred';
end $$;
revoke all on function linklemon_private.wake_push_dispatch() from public,anon,authenticated;
create function linklemon_private.wake_push_after_insert() returns trigger language plpgsql security definer set search_path='' as $$
begin perform linklemon_private.wake_push_dispatch(); return null; end $$;
revoke all on function linklemon_private.wake_push_after_insert() from public,anon,authenticated;
create trigger wake_push_after_insert after insert on linklemon_private.push_jobs for each statement execute function linklemon_private.wake_push_after_insert();
select cron.schedule('linklemon-push-dispatch','* * * * *','select linklemon_private.wake_push_dispatch()');
-- Activated only after the worker is deployed and the matching secret is saved to Vault.
