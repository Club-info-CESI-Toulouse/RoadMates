-- §17 B: a commute (habitual trip) groups per-day slots.
-- commute: Aller = origin → destination (morning), Retour = reverse (evening); role, seats, max walk.
-- trips rows become slots: one weekday, one direction (slot), own anchor time, flexibility and dates.
-- Slot columns copied from the commute (owner, group, role, seats, addresses, max walk) are kept
-- in sync by triggers, so matching and requests keep reading trips unchanged.

create table public.commutes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  role public.trip_role not null,
  seats smallint check (seats between 1 and 8),
  origin_address_id uuid not null references public.addresses (id) on delete restrict,
  destination_address_id uuid not null references public.addresses (id) on delete restrict,
  max_walk_min smallint not null default 9 check (max_walk_min between 3 and 30),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((role = 'driver') = (seats is not null)),
  check (origin_address_id <> destination_address_id)
);
create index commutes_owner_idx on public.commutes (owner_id);
create trigger commutes_set_updated_at before update on public.commutes
  for each row execute function public.set_updated_at();

alter table public.commutes enable row level security;
create policy "commutes owned" on public.commutes
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and group_id in (select public.visible_group_ids()));

create trigger commutes_check_addresses before insert or update of owner_id, origin_address_id, destination_address_id
  on public.commutes for each row execute function public.check_trip_addresses();

-- Data migration: one commute per owner, role, seats and Aller address pair -------------
alter table public.trips add column commute_id uuid references public.commutes (id) on delete cascade;

insert into public.commutes (owner_id, group_id, role, seats, origin_address_id, destination_address_id, max_walk_min, created_at)
select distinct on (owner_id, role, coalesce(seats, 0), a_from, a_to)
  owner_id, group_id, role, seats, a_from, a_to, max_walk_min, created_at
from (
  select t.*,
    case when t.slot = 'morning' then t.origin_address_id else t.destination_address_id end as a_from,
    case when t.slot = 'morning' then t.destination_address_id else t.origin_address_id end as a_to
  from public.trips t
) n
order by owner_id, role, coalesce(seats, 0), a_from, a_to, created_at;

update public.trips t set commute_id = c.id
from public.commutes c
where c.owner_id = t.owner_id and c.role = t.role and coalesce(c.seats, 0) = coalesce(t.seats, 0)
  and (
    (t.slot = 'morning' and c.origin_address_id = t.origin_address_id and c.destination_address_id = t.destination_address_id)
    or (t.slot = 'evening' and c.origin_address_id = t.destination_address_id and c.destination_address_id = t.origin_address_id)
  );

-- Split multi-day trips into one slot per weekday; requests and occurrences follow their date.
do $$
declare
  t public.trips;
  d smallint;
  days smallint[];
  new_id uuid;
begin
  for t in select * from public.trips where cardinality(weekdays) > 1 loop
    days := (select array_agg(x order by x) from unnest(t.weekdays) x);
    foreach d in array days[2:] loop
      -- Another slot of the same commute already covers this day: keep that one.
      continue when exists (
        select 1 from public.trips o
        where o.commute_id = t.commute_id and o.slot = t.slot and o.id <> t.id and d = any (o.weekdays)
      );
      insert into public.trips (
        owner_id, group_id, role, seats, slot, origin_address_id, destination_address_id, weekdays,
        departure_time, arrival_time, estimated_duration_s, flex_before_min, flex_after_min, max_walk_min,
        valid_from, valid_until, is_active, commute_id
      ) values (
        t.owner_id, t.group_id, t.role, t.seats, t.slot, t.origin_address_id, t.destination_address_id, array[d],
        t.departure_time, t.arrival_time, t.estimated_duration_s, t.flex_before_min, t.flex_after_min, t.max_walk_min,
        t.valid_from, t.valid_until, t.is_active, t.commute_id
      ) returning id into new_id;
      update public.trip_occurrences set trip_id = new_id where trip_id = t.id and extract(isodow from date) = d;
      update public.trip_requests set driver_trip_id = new_id where driver_trip_id = t.id and extract(isodow from date) = d;
      update public.trip_requests set passenger_trip_id = new_id where passenger_trip_id = t.id and extract(isodow from date) = d;
    end loop;
    update public.trips set weekdays = array[(select min(x) from unnest(t.weekdays) x)] where id = t.id;
  end loop;
end;
$$;

-- Remaining duplicates (same commute, direction and day) can't be merged: keep the oldest.
delete from public.trips t using public.trips o
where t.commute_id = o.commute_id and t.slot = o.slot and t.weekdays = o.weekdays
  and (o.created_at, o.id) < (t.created_at, t.id);

alter table public.trips
  alter column commute_id set not null,
  add constraint trips_single_weekday check (cardinality(weekdays) = 1);
create unique index trips_one_slot_per_day on public.trips (commute_id, slot, (weekdays[1]));

-- Sync: slots inherit everything commute-level (named to fire before trips_check_addresses) --------------------------------------------
create function public.fill_slot_from_commute()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.commutes;
begin
  select * into c from public.commutes where id = new.commute_id;
  if c.id is null then raise exception 'commute_not_found'; end if;
  new.owner_id := c.owner_id;
  new.group_id := c.group_id;
  new.role := c.role;
  new.seats := c.seats;
  new.max_walk_min := c.max_walk_min;
  new.origin_address_id := case when new.slot = 'morning' then c.origin_address_id else c.destination_address_id end;
  new.destination_address_id := case when new.slot = 'morning' then c.destination_address_id else c.origin_address_id end;
  return new;
end;
$$;
revoke execute on function public.fill_slot_from_commute() from public, anon, authenticated;
create trigger trips_a_fill_from_commute before insert or update on public.trips
  for each row execute function public.fill_slot_from_commute();

create function public.sync_commute_slots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Re-running the fill trigger copies the new commute values.
  update public.trips set commute_id = commute_id where commute_id = new.id;
  if new.is_active is distinct from old.is_active then
    update public.trips set is_active = new.is_active where commute_id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_commute_slots() from public, anon, authenticated;
create trigger commutes_sync_slots after update on public.commutes
  for each row execute function public.sync_commute_slots();
