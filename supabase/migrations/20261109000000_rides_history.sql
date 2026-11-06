-- Rides history: requests outlive the trip they were made on.
-- Deleting a trip cancels its open requests (partners are told) and keeps past ones.

alter table public.trip_requests
  alter column occurrence_id drop not null,
  alter column driver_trip_id drop not null,
  alter column passenger_trip_id drop not null,
  drop constraint trip_requests_occurrence_id_fkey,
  drop constraint trip_requests_driver_trip_id_fkey,
  drop constraint trip_requests_passenger_trip_id_fkey,
  add constraint trip_requests_occurrence_id_fkey foreign key (occurrence_id)
    references public.trip_occurrences (id) on delete set null,
  add constraint trip_requests_driver_trip_id_fkey foreign key (driver_trip_id)
    references public.trips (id) on delete set null,
  add constraint trip_requests_passenger_trip_id_fkey foreign key (passenger_trip_id)
    references public.trips (id) on delete set null;

create function public.cancel_requests_of_deleted_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Account deletion: the requests of that user are removed with the profile.
  if not exists (select 1 from public.profiles p where p.id = old.owner_id) then
    return old;
  end if;
  update public.trip_requests
  set status = 'cancelled', cancel_reason = 'cancelled', cancelled_by = old.owner_id
  where (driver_trip_id = old.id or passenger_trip_id = old.id)
    and status <> 'cancelled'
    and dropoff_at > now();
  return old;
end;
$$;
revoke execute on function public.cancel_requests_of_deleted_trip() from public, anon, authenticated;
create trigger trips_cancel_requests before delete on public.trips
  for each row execute function public.cancel_requests_of_deleted_trip();
