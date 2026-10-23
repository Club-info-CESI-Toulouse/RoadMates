-- Phases 9-10: push subscriptions, notification preferences, delivery hook, account deletion support.

-- Preferences ------------------------------------------------------------------
alter table public.profiles
  add column push_enabled boolean not null default true,
  add column email_enabled boolean not null default true;
grant update (push_enabled, email_enabled) on public.profiles to authenticated;

-- Push subscriptions (one per device) -------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push subscriptions owned" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke update on public.push_subscriptions from anon, authenticated;

-- Notifications: keep them when the request is deleted; delivery tracking --------
alter table public.notifications
  drop constraint notifications_request_id_fkey,
  add constraint notifications_request_id_fkey foreign key (request_id)
    references public.trip_requests (id) on delete set null,
  add column conversation_id uuid references public.conversations (id) on delete cascade,
  add column delivered_at timestamptz;

-- New messages notify the recipient, at most once per conversation every 15 min while unread.
create function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.conversations;
  recipient uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  recipient := case when c.user_a = new.sender_id then c.user_b else c.user_a end;
  if exists (
    select 1 from public.notifications n
    where n.user_id = recipient and n.conversation_id = c.id and n.kind = 'new_message'
      and n.created_at > now() - interval '15 minutes'
  ) then
    return new;
  end if;
  insert into public.notifications (user_id, kind, conversation_id, payload)
  select recipient, 'new_message', c.id, jsonb_build_object('other_name', p.display_name, 'preview', left(new.body, 100))
  from public.profiles p where p.id = new.sender_id;
  return new;
end;
$$;
revoke execute on function public.notify_new_message() from public, anon, authenticated;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_new_message();

-- Delivery: each new notification is posted to the app (push, email fallback).
-- URL and shared secret live in Vault ('notify_url', 'notify_secret').
create extension if not exists pg_net with schema extensions;

create function public.dispatch_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
  secret text;
begin
  select decrypted_secret into target from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'notify_secret';
  if target is null or secret is null then return new; end if;
  perform net.http_post(
    url := target,
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret)
  );
  return new;
end;
$$;
revoke execute on function public.dispatch_notification() from public, anon, authenticated;
create trigger notifications_dispatch after insert on public.notifications
  for each row execute function public.dispatch_notification();

-- Retention: read notifications are purged after 90 days (lazy, on reads).
create function public.purge_old_notifications()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.notifications where created_at < now() - interval '90 days';
$$;
revoke execute on function public.purge_old_notifications() from public, anon;
grant execute on function public.purge_old_notifications() to authenticated;

-- Stats (phase 10): rides completed by the user ---------------------------------
create function public.my_ride_stats()
returns table (rides int, distance_m bigint, partners int)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::int,
         coalesce(sum(r.distance_m), 0)::bigint,
         count(distinct case when r.driver_id = auth.uid() then r.passenger_id else r.driver_id end)::int
  from public.trip_requests r
  where r.status = 'accepted' and r.dropoff_at < now()
    and auth.uid() in (r.driver_id, r.passenger_id);
$$;
revoke execute on function public.my_ride_stats() from public, anon;
grant execute on function public.my_ride_stats() to authenticated;
