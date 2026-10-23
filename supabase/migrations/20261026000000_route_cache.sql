-- Phase 5: route cache (OpenRouteService results). Server-only (service role), no policies.
-- Key = SHA-256 of profile + rounded coordinates; payload encrypted (geometry reveals addresses).

create table public.route_cache (
  key text primary key,
  payload_encrypted text not null,
  created_at timestamptz not null default now()
);

alter table public.route_cache enable row level security;
revoke all on public.route_cache from anon, authenticated;
