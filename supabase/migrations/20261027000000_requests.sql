-- Phases 6-7: ride requests per driver occurrence, in-app notifications.
-- A request links a driver trip and a passenger trip on one date (morning or evening).
-- It snapshots the proposal computed server-side (meeting point, times, walk, detour).
-- Writes go through the functions below (row locks keep seat counts consistent).

create type public.request_status as enum ('pending', 'accepted', 'cancelled');
create type public.cancel_reason as enum (
  'declined', 'withdrawn', 'cancelled', 'full', 'past', 'passenger_matched', 'schedule_changed'
);

create table public.trip_requests (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.trip_occurrences (id) on delete cascade,
  driver_trip_id uuid not null references public.trips (id) on delete cascade,
  passenger_trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  slot public.trip_slot not null,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  status public.request_status not null default 'pending',
  cancel_reason public.cancel_reason,
  cancelled_by uuid references public.profiles (id) on delete set null,
  driver_departure_at timestamptz not null,
  pickup_at timestamptz not null,
  dropoff_at timestamptz not null,
  pickup_lat double precision not null,
  pickup_lon double precision not null,
  pickup_label text check (char_length(pickup_label) <= 200),
  dropoff_lat double precision not null,
  dropoff_lon double precision not null,
  dropoff_label text check (char_length(dropoff_label) <= 200),
  walk_min smallint not null check (walk_min >= 0),
  detour_min smallint not null check (detour_min >= 0),
  detour_m integer not null check (detour_m >= 0),
  distance_m integer not null check (distance_m >= 0),
  score smallint not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (driver_id <> passenger_id),
  check (sender_id in (driver_id, passenger_id)),
  check ((status = 'cancelled') = (cancel_reason is not null))
);
create unique index trip_requests_one_open_per_pair on public.trip_requests (driver_trip_id, passenger_trip_id, date)
  where status <> 'cancelled';
create unique index trip_requests_one_ride_per_passenger on public.trip_requests (passenger_id, date, slot)
  where status = 'accepted';
create index trip_requests_occurrence_idx on public.trip_requests (occurrence_id);
create index trip_requests_driver_idx on public.trip_requests (driver_id, date);
create index trip_requests_passenger_idx on public.trip_requests (passenger_id, date);
create index trip_requests_sender_pending_idx on public.trip_requests (sender_id, date, slot)
  where status = 'pending';
create trigger trip_requests_set_updated_at before update on public.trip_requests
  for each row execute function public.set_updated_at();

alter table public.trip_requests enable row level security;
create policy "requests readable by parties" on public.trip_requests
  for select to authenticated
  using ((select auth.uid()) in (driver_id, passenger_id));
revoke insert, update, delete on public.trip_requests from anon, authenticated;

-- Notifications (in-app; push/email delivery comes in phase 9) ------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  request_id uuid references public.trip_requests (id) on delete cascade,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications readable by owner" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications markable as read by owner" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Notify the other party on every request change.
create function public.notify_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid := case when new.sender_id = new.driver_id then new.passenger_id else new.driver_id end;
  kind text;
  target uuid;
  actor uuid;
begin
  if tg_op = 'INSERT' then
    kind := 'request_received'; target := recipient; actor := new.sender_id;
  elsif new.status = 'accepted' and old.status = 'pending' then
    kind := 'request_accepted'; target := new.sender_id; actor := recipient;
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    kind := 'request_' || new.cancel_reason::text;
    if new.cancelled_by is null then
      target := new.sender_id; actor := recipient;
    else
      actor := new.cancelled_by;
      target := case when actor = new.driver_id then new.passenger_id else new.driver_id end;
    end if;
    -- An automatic cancellation of an accepted ride concerns both users.
    if new.cancelled_by is null and old.status = 'accepted' then
      insert into public.notifications (user_id, kind, request_id, payload)
      select recipient, kind, new.id, jsonb_build_object('date', new.date, 'slot', new.slot, 'other_name', p.display_name)
      from public.profiles p where p.id = new.sender_id;
    end if;
  else
    return new;
  end if;

  insert into public.notifications (user_id, kind, request_id, payload)
  select target, kind, new.id, jsonb_build_object('date', new.date, 'slot', new.slot, 'other_name', p.display_name)
  from public.profiles p where p.id = actor;
  return new;
end;
$$;
revoke execute on function public.notify_request_change() from public, anon, authenticated;

create trigger trip_requests_notify after insert or update of status on public.trip_requests
  for each row execute function public.notify_request_change();

-- Helpers ----------------------------------------------------------------------

-- Cancels pending requests whose occurrence has started. Called lazily on reads.
create function public.expire_trip_requests()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.trip_requests
  set status = 'cancelled', cancel_reason = 'past'
  where status = 'pending' and driver_departure_at <= now();
$$;
revoke execute on function public.expire_trip_requests() from public, anon;
grant execute on function public.expire_trip_requests() to authenticated, service_role;

-- After an acceptance: cancel what can no longer happen.
create function public.settle_occurrence(p_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.trip_requests;
  seats int;
  taken int;
begin
  select * into r from public.trip_requests where id = p_request;
  select o.seats_total into seats from public.trip_occurrences o where o.id = r.occurrence_id;
  select count(*) into taken from public.trip_requests
    where occurrence_id = r.occurrence_id and status = 'accepted';

  -- Passenger has a ride: other open requests for that slot are moot.
  update public.trip_requests set status = 'cancelled', cancel_reason = 'passenger_matched'
    where passenger_id = r.passenger_id and date = r.date and slot = r.slot
      and status = 'pending' and id <> r.id;
  -- The driver's departure is now fixed for this occurrence.
  update public.trip_requests set status = 'cancelled', cancel_reason = 'schedule_changed'
    where occurrence_id = r.occurrence_id and status = 'pending'
      and driver_departure_at <> r.driver_departure_at;
  if taken >= seats then
    update public.trip_requests set status = 'cancelled', cancel_reason = 'full'
      where occurrence_id = r.occurrence_id and status = 'pending';
  end if;
end;
$$;
revoke execute on function public.settle_occurrence(uuid) from public, anon, authenticated;

-- Create (server only: the proposal is computed server-side with decrypted addresses).
create function public.create_trip_request(
  p_sender uuid,
  p_driver_trip uuid,
  p_passenger_trip uuid,
  p_date date,
  p_occurrence_departure timestamptz,
  p_occurrence_arrival timestamptz,
  p_driver_departure timestamptz,
  p_pickup_at timestamptz,
  p_dropoff_at timestamptz,
  p_pickup_lat double precision,
  p_pickup_lon double precision,
  p_pickup_label text,
  p_dropoff_lat double precision,
  p_dropoff_lon double precision,
  p_dropoff_label text,
  p_walk_min int,
  p_detour_min int,
  p_detour_m int,
  p_distance_m int,
  p_score int,
  p_max_pending int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.trips;
  p public.trips;
  occ public.trip_occurrences;
  new_id uuid;
begin
  select * into d from public.trips where id = p_driver_trip and is_active and role = 'driver';
  select * into p from public.trips where id = p_passenger_trip and is_active and role = 'passenger';
  if d.id is null or p.id is null or d.slot <> p.slot or d.owner_id = p.owner_id
     or p_sender not in (d.owner_id, p.owner_id) then
    raise exception 'invalid_trips';
  end if;
  if p_driver_departure <= now() then raise exception 'past'; end if;

  insert into public.trip_occurrences (trip_id, date, departure_at, arrival_at, seats_total)
  values (d.id, p_date, p_occurrence_departure, p_occurrence_arrival, d.seats)
  on conflict (trip_id, date) do nothing;
  select * into occ from public.trip_occurrences where trip_id = d.id and date = p_date for update;
  if occ.status = 'cancelled' then raise exception 'occurrence_cancelled'; end if;

  if (select count(*) from public.trip_requests
      where occurrence_id = occ.id and status = 'accepted') >= occ.seats_total then
    raise exception 'full';
  end if;
  if exists (select 1 from public.trip_requests
             where passenger_id = p.owner_id and date = p_date and slot = p.slot and status = 'accepted') then
    raise exception 'passenger_matched';
  end if;
  if exists (select 1 from public.trip_requests
             where driver_trip_id = d.id and passenger_trip_id = p.id and date = p_date and status <> 'cancelled') then
    raise exception 'duplicate';
  end if;
  if (select count(*) from public.trip_requests
      where sender_id = p_sender and date = p_date and slot = d.slot and status = 'pending') >= p_max_pending then
    raise exception 'limit';
  end if;

  insert into public.trip_requests (
    occurrence_id, driver_trip_id, passenger_trip_id, date, slot, driver_id, passenger_id, sender_id,
    driver_departure_at, pickup_at, dropoff_at, pickup_lat, pickup_lon, pickup_label,
    dropoff_lat, dropoff_lon, dropoff_label, walk_min, detour_min, detour_m, distance_m, score
  ) values (
    occ.id, d.id, p.id, p_date, d.slot, d.owner_id, p.owner_id, p_sender,
    p_driver_departure, p_pickup_at, p_dropoff_at, p_pickup_lat, p_pickup_lon, p_pickup_label,
    p_dropoff_lat, p_dropoff_lon, p_dropoff_label, p_walk_min, p_detour_min, p_detour_m, p_distance_m, p_score
  ) returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.create_trip_request(
  uuid, uuid, uuid, date, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz,
  double precision, double precision, text, double precision, double precision, text, int, int, int, int, int, int
) from public, anon, authenticated;
grant execute on function public.create_trip_request(
  uuid, uuid, uuid, date, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz,
  double precision, double precision, text, double precision, double precision, text, int, int, int, int, int, int
) to service_role;

-- Accept (recipient only).
create function public.accept_trip_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.trip_requests;
  seats int;
begin
  select * into r from public.trip_requests where id = p_id for update;
  if r.id is null or auth.uid() not in (r.driver_id, r.passenger_id) or auth.uid() = r.sender_id then
    raise exception 'forbidden';
  end if;
  if r.status <> 'pending' then raise exception 'not_pending'; end if;
  if r.driver_departure_at <= now() then raise exception 'past'; end if;

  select o.seats_total into seats from public.trip_occurrences o where o.id = r.occurrence_id for update;
  if (select count(*) from public.trip_requests
      where occurrence_id = r.occurrence_id and status = 'accepted') >= seats then
    raise exception 'full';
  end if;
  if exists (select 1 from public.trip_requests
             where passenger_id = r.passenger_id and date = r.date and slot = r.slot and status = 'accepted') then
    raise exception 'passenger_matched';
  end if;
  if exists (select 1 from public.trip_requests
             where occurrence_id = r.occurrence_id and status = 'accepted'
               and driver_departure_at <> r.driver_departure_at) then
    raise exception 'schedule_changed';
  end if;

  update public.trip_requests set status = 'accepted' where id = p_id;
  perform public.settle_occurrence(p_id);
end;
$$;
revoke execute on function public.accept_trip_request(uuid) from public, anon;
grant execute on function public.accept_trip_request(uuid) to authenticated;

-- Cancel / decline / withdraw (either party). Accepted rides lock 5 min before the driver leaves.
create function public.cancel_trip_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.trip_requests;
begin
  select * into r from public.trip_requests where id = p_id for update;
  if r.id is null or auth.uid() not in (r.driver_id, r.passenger_id) then raise exception 'forbidden'; end if;
  if r.status = 'cancelled' then return; end if;
  if r.status = 'accepted' and now() > r.driver_departure_at - interval '5 minutes' then
    raise exception 'too_late';
  end if;

  update public.trip_requests
  set status = 'cancelled',
      cancelled_by = auth.uid(),
      cancel_reason = case
        when r.status = 'accepted' then 'cancelled'
        when auth.uid() = r.sender_id then 'withdrawn'
        else 'declined'
      end::public.cancel_reason
  where id = p_id;
end;
$$;
revoke execute on function public.cancel_trip_request(uuid) from public, anon;
grant execute on function public.cancel_trip_request(uuid) to authenticated;

-- Seats taken per driver occurrence, for proposals (counterparts can't read others' requests).
create function public.occurrence_load(p_trip_ids uuid[], p_date date)
returns table (trip_id uuid, seats_total smallint, accepted int, fixed_departure timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.trip_id, o.seats_total,
         count(r.id) filter (where r.status = 'accepted')::int,
         min(r.driver_departure_at) filter (where r.status = 'accepted')
  from public.trip_occurrences o
  join public.trips t on t.id = o.trip_id
  left join public.trip_requests r on r.occurrence_id = o.id
  where o.trip_id = any (p_trip_ids) and o.date = p_date
    and (t.owner_id = auth.uid() or t.group_id in (select public.visible_group_ids()))
  group by o.trip_id, o.seats_total;
$$;
revoke execute on function public.occurrence_load(uuid[], date) from public, anon;
grant execute on function public.occurrence_load(uuid[], date) to authenticated;
