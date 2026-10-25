-- §17 A: named addresses. A free list (max 10) replaces home/work/school.
-- Name and icon are clear text; label and coordinates stay encrypted (payload_encrypted).

create type public.address_icon as enum ('home', 'work', 'star');

alter table public.addresses
  add column name text,
  add column icon public.address_icon not null default 'star',
  add column confirmed boolean not null default true;

update public.addresses set
  name = case kind when 'home' then 'Maison' when 'work' then 'Travail' when 'school' then 'CESI' else 'Adresse' end,
  icon = case kind when 'home' then 'home'::public.address_icon when 'work' then 'work'::public.address_icon else 'star'::public.address_icon end;

alter table public.addresses
  alter column name set not null,
  add constraint addresses_name_length check (char_length(btrim(name)) between 1 and 40),
  alter column kind set default 'other';
comment on column public.addresses.kind is 'Deprecated (pre-§17); use name and icon.';
drop index public.addresses_one_per_fixed_kind;

create function public.limit_addresses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.addresses where user_id = new.user_id) >= 10 then
    raise exception 'address_limit';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_addresses() from public, anon, authenticated;
create trigger addresses_limit before insert on public.addresses
  for each row execute function public.limit_addresses();

-- Default "CESI" address (campus, to confirm) is created once, server-side (encryption).
alter table public.profiles add column default_address_seeded boolean not null default false;
update public.profiles p set default_address_seeded = true
where exists (select 1 from public.addresses a where a.user_id = p.id and a.kind = 'school');
grant update (default_address_seeded) on public.profiles to authenticated;
