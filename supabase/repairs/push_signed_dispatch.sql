-- Supabase manages pg_net privileges. Never store a reusable credential in its request queue.
create table linklemon_private.push_dispatch_receipts(nonce uuid primary key,created_at timestamptz not null default now());
alter table linklemon_private.push_dispatch_receipts enable row level security;
revoke all on linklemon_private.push_dispatch_receipts from public,anon,authenticated;
create function linklemon_private.consume_push_dispatch_nonce(nonce_value uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Not allowed' using errcode='42501'; end if;
 delete from linklemon_private.push_dispatch_receipts where created_at<now()-interval '1 day';
 insert into linklemon_private.push_dispatch_receipts(nonce) values(nonce_value) on conflict(nonce) do nothing;
 return found;
end $$;
revoke all on function linklemon_private.consume_push_dispatch_nonce(uuid) from public,anon,authenticated;
grant execute on function linklemon_private.consume_push_dispatch_nonce(uuid) to service_role;
create function public.consume_push_dispatch_nonce(nonce_value uuid) returns boolean language sql security invoker set search_path='' as $$select linklemon_private.consume_push_dispatch_nonce(nonce_value)$$;
revoke all on function public.consume_push_dispatch_nonce(uuid) from public,anon,authenticated;
grant execute on function public.consume_push_dispatch_nonce(uuid) to service_role;

create or replace function linklemon_private.wake_push_dispatch() returns void language plpgsql security definer set search_path='' as $$
declare dispatch_secret text; stamp bigint:=floor(extract(epoch from clock_timestamp())); nonce_value uuid:=gen_random_uuid(); signature text;
begin
 if not exists(select 1 from linklemon_private.push_dispatch_config where enabled) then return; end if;
 if not exists(select 1 from linklemon_private.push_jobs where status in ('pending','working') and due_at<=now() and expires_at>now()) then return; end if;
 select decrypted_secret into dispatch_secret from vault.decrypted_secrets where name='linklemon_push_dispatch_secret' limit 1;
 if dispatch_secret is null or length(dispatch_secret)<32 then return; end if;
 update linklemon_private.push_dispatch_config set last_wake_at=clock_timestamp() where singleton and enabled and last_wake_at<clock_timestamp()-interval '5 seconds';
 if not found then return; end if;
 signature:=encode(extensions.hmac(convert_to(stamp::text||':'||nonce_value::text||':linklemon-push-dispatch-v1','UTF8'),convert_to(dispatch_secret,'UTF8'),'sha256'),'hex');
 perform net.http_post(url:='https://getlinklemon.com/api/push/dispatch',body:=jsonb_build_object('timestamp',stamp,'nonce',nonce_value,'signature',signature),headers:=jsonb_build_object('Content-Type','application/json'),timeout_milliseconds:=60000);
exception when others then raise log 'LinkLemon push wake-up deferred';
end $$;
revoke all on function linklemon_private.wake_push_dispatch() from public,anon,authenticated;
