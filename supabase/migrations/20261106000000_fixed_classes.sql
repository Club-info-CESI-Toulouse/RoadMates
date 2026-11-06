-- Classes are created by hand in the database: users only pick an existing one.
-- Adds "FISA Info A" and moves every user there (their commutes and slots follow).

create or replace function public.group_for_class(p_establishment uuid, p_name text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.id from public.groups g
  where g.establishment_id = p_establishment
    and lower(btrim(g.name)) = lower(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'));
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
  v_group uuid := public.group_for_class(
    public.establishment_id_for_email(new.email),
    new.raw_user_meta_data ->> 'class_name'
  );
begin
  if v_group is null then
    raise exception 'invalid_class' using errcode = 'check_violation';
  end if;
  if char_length(v_name) not between 1 and 40 then
    v_name := 'Utilisateur';
  end if;
  insert into public.profiles (id, display_name, group_id) values (new.id, v_name, v_group);
  return new;
end;
$$;

insert into public.groups (establishment_id, name)
select id, 'FISA Info A' from public.establishments where email_domain = 'viacesi.fr'
on conflict (establishment_id, lower(btrim(name))) do nothing;

with target as (
  select g.id from public.groups g
  join public.establishments e on e.id = g.establishment_id
  where e.email_domain = 'viacesi.fr' and g.name = 'FISA Info A'
)
update public.profiles set group_id = (select id from target);

with target as (
  select g.id from public.groups g
  join public.establishments e on e.id = g.establishment_id
  where e.email_domain = 'viacesi.fr' and g.name = 'FISA Info A'
)
update public.commutes set group_id = (select id from target);
