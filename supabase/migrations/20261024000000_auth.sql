-- Phase 2: sign-up rules, profile creation, verification attempt counter.

-- Allowed email domains come from establishments (Part A: viacesi.fr only).
create function public.establishment_id_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.establishments e
  where e.email_domain = lower(split_part(p_email, '@', 2))
$$;

revoke execute on function public.establishment_id_for_email(text) from public, anon, authenticated;

-- Reject sign-ups and email changes outside an allowed domain (server-side guard).
create function public.enforce_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or public.establishment_id_for_email(new.email) is null then
    raise exception 'email_domain_not_allowed' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_email_domain_on_insert
  before insert on auth.users
  for each row execute function public.enforce_email_domain();

create trigger enforce_email_domain_on_update
  before update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function public.enforce_email_domain();

-- Create the profile and attach it to the establishment's group.
-- Part A: one group per establishment (the oldest). Part B: choose the class here.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if char_length(v_name) not between 1 and 40 then
    v_name := 'Utilisateur';
  end if;

  insert into public.profiles (id, display_name, group_id)
  values (
    new.id,
    v_name,
    (
      select g.id from public.groups g
      where g.establishment_id = public.establishment_id_for_email(new.email)
      order by g.created_at
      limit 1
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.enforce_email_domain() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Verification code attempts (max 5 per code). Server-only (service role), no policies.
-- Email is stored as a SHA-256 hash.
create table public.verification_attempts (
  email_hash text not null,
  purpose text not null check (purpose in ('signup', 'recovery')),
  attempts smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (email_hash, purpose)
);

alter table public.verification_attempts enable row level security;
revoke all on public.verification_attempts from anon, authenticated;

-- Atomically record one failed attempt and return the new count.
create function public.record_verification_failure(p_email_hash text, p_purpose text)
returns smallint
language sql
security definer
set search_path = ''
as $$
  insert into public.verification_attempts as va (email_hash, purpose, attempts)
  values (p_email_hash, p_purpose, 1)
  on conflict (email_hash, purpose)
  do update set attempts = va.attempts + 1, updated_at = now()
  returning va.attempts
$$;

revoke execute on function public.record_verification_failure(text, text) from public, anon, authenticated;
grant execute on function public.record_verification_failure(text, text) to service_role;
