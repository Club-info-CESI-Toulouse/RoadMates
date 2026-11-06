-- In-app banners: stream new notifications to their owner (RLS applies).
alter publication supabase_realtime add table public.notifications;
