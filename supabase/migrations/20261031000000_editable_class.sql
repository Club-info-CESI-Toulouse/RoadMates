-- Class chosen at sign-up and editable later. A class is a group of the establishment,
-- matched case-insensitively and created on first use.

alter table public.groups add constraint groups_name_length check (char_length(btrim(name)) between 2 and 60);
create unique index groups_unique_name on public.groups (establishment_id, lower(btrim(name)));

-- Normalised class name → group id (created if missing).
create function public.group_for_class(p_establishment uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_id uuid;
begin
  if p_establishment is null or char_length(v_name) not between 2 and 60 then
    return null;
  end if;
  insert into public.groups (establishment_id, name) values (p_establishment, v_name)
  on conflict (establishment_id, lower(btrim(name))) do nothing;
  select id into v_id from public.groups
  where establishment_id = p_establishment and lower(btrim(name)) = lower(v_name);
  return v_id;
end;
$$;
revoke execute on function public.group_for_class(uuid, text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  v_establishment uuid := public.establishment_id_for_email(new.email);
  v_group uuid := public.group_for_class(v_establishment, new.raw_user_meta_data ->> 'class_name');
begin
  if char_length(v_name) not between 1 and 40 then
    v_name := 'Utilisateur';
  end if;
  if v_group is null then
    select g.id into v_group from public.groups g
    where g.establishment_id = v_establishment order by g.created_at limit 1;
  end if;
  insert into public.profiles (id, display_name, group_id) values (new.id, v_name, v_group);
  return new;
end;
$$;

-- Change of class: the user's trips follow; pending requests with the former class are withdrawn.
create function public.change_class(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  v_establishment uuid;
  v_group uuid;
begin
  select g.establishment_id into v_establishment
  from public.profiles p join public.groups g on g.id = p.group_id where p.id = me;
  if v_establishment is null then
    select public.establishment_id_for_email(u.email) into v_establishment from auth.users u where u.id = me;
  end if;
  v_group := public.group_for_class(v_establishment, p_name);
  if me is null or v_group is null then raise exception 'invalid_class'; end if;

  update public.profiles set group_id = v_group where id = me and group_id is distinct from v_group;
  if found then
    update public.trips set group_id = v_group where owner_id = me;
    update public.trip_requests
    set status = 'cancelled', cancel_reason = 'withdrawn', cancelled_by = me
    where status = 'pending' and me in (driver_id, passenger_id);
  end if;
  return (select name from public.groups where id = v_group);
end;
$$;
revoke execute on function public.change_class(text) from public, anon;
grant execute on function public.change_class(text) to authenticated;

-- Existing class names, for suggestions at sign-up (names only, no members).
create function public.class_names()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select g.name from public.groups g
  join public.establishments e on e.id = g.establishment_id
  where e.email_domain = 'viacesi.fr'
  order by lower(g.name);
$$;
revoke execute on function public.class_names() from public;
grant execute on function public.class_names() to anon, authenticated;
