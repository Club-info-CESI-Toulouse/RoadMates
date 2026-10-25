-- §17 C: driving route alternatives per commute direction, chosen by the driver.
-- Computed once when the commute is saved; geometries are encrypted (they reveal addresses).

create table public.commute_routes (
  commute_id uuid not null references public.commutes (id) on delete cascade,
  direction public.trip_slot not null,
  idx smallint not null check (idx between 0 and 4),
  label text not null check (char_length(label) <= 80),
  distance_m integer not null check (distance_m >= 0),
  duration_s integer not null check (duration_s >= 0),
  geometry_encrypted text not null,
  created_at timestamptz not null default now(),
  primary key (commute_id, direction, idx)
);

alter table public.commute_routes enable row level security;
create policy "commute routes readable by owner" on public.commute_routes
  for select to authenticated
  using (commute_id in (select c.id from public.commutes c where c.owner_id = (select auth.uid())));
revoke insert, update, delete on public.commute_routes from anon, authenticated;

-- Chosen route per direction; null = all routes.
alter table public.commutes
  add column morning_route smallint check (morning_route between 0 and 4),
  add column evening_route smallint check (evening_route between 0 and 4);
