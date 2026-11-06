-- Pending requests counter in the menu: stream request changes to their parties (RLS applies).
alter publication supabase_realtime add table public.trip_requests;
