-- Phase 1: base data model.
-- Establishment > group > users/trips. Recurring trip (template) vs occurrence (dated, morning/evening).
-- Visibility is centralised in public.visible_group_ids(): Part B only widens that function.

-- Enums ----------------------------------------------------------------------

create type public.trip_role as enum ('driver', 'passenger');
create type public.trip_slot as enum ('morning', 'evening');
create type public.address_kind as enum ('home', 'work', 'school', 'other');
create type public.occurrence_status as enum ('scheduled', 'cancelled');

-- Helpers --------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Establishments (schools) ---------------------------------------------------
-- School address is public data (not personal), stored in clear.

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email_domain text not null unique check (email_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  address text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);

-- Groups (classes) -----------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);
create index groups_establishment_id_idx on public.groups (establishment_id);

-- Profiles -------------------------------------------------------------------
-- Email lives only in auth.users and is never exposed. display_name is not unique.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_group_id_idx on public.profiles (group_id);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Addresses ------------------------------------------------------------------
-- Label + coordinates are encrypted server-side (AES-256-GCM, versioned prefix).
-- Only the owner can read the ciphertext; decryption happens on the server.

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.address_kind not null,
  payload_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_id_idx on public.addresses (user_id);
create unique index addresses_one_per_fixed_kind on public.addresses (user_id, kind)
  where kind in ('home', 'work', 'school');
create trigger addresses_set_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

-- Recurring trips (templates) ------------------------------------------------
-- Bounds mirror src/lib/trips/constants.ts.

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  role public.trip_role not null,
  seats smallint check (seats between 1 and 8),
  slot public.trip_slot not null,
  origin_address_id uuid not null references public.addresses (id) on delete restrict,
  destination_address_id uuid not null references public.addresses (id) on delete restrict,
  weekdays smallint[] not null check (
    cardinality(weekdays) between 1 and 7 and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  departure_time time,
  arrival_time time,
  estimated_duration_s integer check (estimated_duration_s > 0),
  flex_before_min smallint not null default 10 check (flex_before_min between 0 and 60),
  flex_after_min smallint not null default 5 check (flex_after_min between 0 and 60),
  max_walk_min smallint not null default 9 check (max_walk_min between 3 and 30),
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (departure_time is not null or arrival_time is not null),
  check ((role = 'driver') = (seats is not null)),
  check (valid_from is null or valid_until is null or valid_from <= valid_until),
  check (origin_address_id <> destination_address_id)
);
create index trips_group_id_idx on public.trips (group_id) where is_active;
create index trips_owner_id_idx on public.trips (owner_id);
create trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

-- Trip occurrences (one trip on one date) ------------------------------------
-- Created on demand (e.g. first request). Requests, seats and cancellations attach here.
-- Times are snapshotted so later edits of the template don't rewrite history.

create table public.trip_occurrences (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  seats_total smallint check (seats_total between 1 and 8),
  status public.occurrence_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  unique (trip_id, date),
  check (departure_at < arrival_at)
);
create index trip_occurrences_date_idx on public.trip_occurrences (date);

-- Visibility (single source of truth) ----------------------------------------
-- Part A: a user sees their own group only.
-- Part B: widen here (e.g. every group of the same establishment).

create function public.visible_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.group_id
  from public.profiles p
  where p.id = auth.uid() and p.group_id is not null
$$;

revoke execute on function public.visible_group_ids() from public, anon;
grant execute on function public.visible_group_ids() to authenticated;

-- Row Level Security ---------------------------------------------------------

alter table public.establishments enable row level security;
alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.trips enable row level security;
alter table public.trip_occurrences enable row level security;

create policy "establishments readable by members" on public.establishments
  for select to authenticated
  using (id in (
    select g.establishment_id from public.groups g
    where g.id in (select public.visible_group_ids())
  ));

create policy "groups readable when visible" on public.groups
  for select to authenticated
  using (id in (select public.visible_group_ids()));

create policy "profiles readable by self or visible groups" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or group_id in (select public.visible_group_ids()));

-- Group assignment is server-side only (service role); users edit their display name.
create policy "profiles updatable by self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "addresses owned" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "trips readable when visible" on public.trips
  for select to authenticated
  using (owner_id = (select auth.uid()) or group_id in (select public.visible_group_ids()));

create policy "trips insertable by owner in own group" on public.trips
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and group_id in (select public.visible_group_ids()));

create policy "trips updatable by owner" on public.trips
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and group_id in (select public.visible_group_ids()));

create policy "trips deletable by owner" on public.trips
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Occurrences are written by server logic (phase 7); readable alongside their trip.
create policy "occurrences readable with trip" on public.trip_occurrences
  for select to authenticated
  using (trip_id in (select t.id from public.trips t));

revoke insert, update, delete on public.establishments, public.groups, public.trip_occurrences
  from anon, authenticated;

-- Seed: default school and Part A class --------------------------------------

insert into public.establishments (name, email_domain)
values ('CESI', 'viacesi.fr');

insert into public.groups (establishment_id, name)
select id, 'Classe RoadMates' from public.establishments where email_domain = 'viacesi.fr';
