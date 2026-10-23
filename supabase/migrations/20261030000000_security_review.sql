-- Phase 11 security review.

-- A trip may only use its owner's addresses (address ids are visible to the group
-- through trips; without this, a member could probe someone else's address via matching).
create function public.check_trip_addresses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.addresses a
      where a.id in (new.origin_address_id, new.destination_address_id) and a.user_id = new.owner_id) <> 2 then
    raise exception 'address_not_owned';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_trip_addresses() from public, anon, authenticated;
create trigger trips_check_addresses before insert or update of owner_id, origin_address_id, destination_address_id
  on public.trips for each row execute function public.check_trip_addresses();

-- Address ids of other users are not needed by clients.
revoke select (origin_address_id, destination_address_id) on public.trips from anon;

-- Signed-out visitors never read app tables (policies already target authenticated only).
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
