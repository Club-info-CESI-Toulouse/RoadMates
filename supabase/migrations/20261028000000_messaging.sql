-- Phase 8: internal messaging. One thread per pair of users, text only, realtime.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  a_read_at timestamptz,
  b_read_at timestamptz,
  last_message_at timestamptz,
  last_sender_id uuid references public.profiles (id) on delete set null,
  last_message text,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_user_b_idx on public.conversations (user_b);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations readable by participants" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy "messages readable by participants" on public.messages
  for select to authenticated
  using (conversation_id in (select c.id from public.conversations c));

-- Sending requires the other participant to still be visible (same group in Part A).
create policy "messages sendable by participants" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      join public.profiles o on o.id = case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end
      where c.id = conversation_id
        and (select auth.uid()) in (c.user_a, c.user_b)
        and o.group_id in (select public.visible_group_ids())
    )
  );

revoke insert, update, delete on public.conversations from anon, authenticated;
revoke update, delete on public.messages from anon, authenticated;
revoke insert on public.messages from anon;

-- Keep the thread summary in sync (list ordering, unread badge).
create function public.on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_sender_id = new.sender_id,
      last_message = left(new.body, 140),
      a_read_at = case when user_a = new.sender_id then new.created_at else a_read_at end,
      b_read_at = case when user_b = new.sender_id then new.created_at else b_read_at end
  where id = new.conversation_id;
  return new;
end;
$$;
revoke execute on function public.on_message_insert() from public, anon, authenticated;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_insert();

create function public.get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  a uuid := least(me, p_other);
  b uuid := greatest(me, p_other);
  conv uuid;
begin
  if me is null or p_other = me or not exists (
    select 1 from public.profiles p
    where p.id = p_other and p.group_id in (select public.visible_group_ids())
  ) then
    raise exception 'forbidden';
  end if;
  insert into public.conversations (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do nothing;
  select id into conv from public.conversations where user_a = a and user_b = b;
  return conv;
end;
$$;
revoke execute on function public.get_or_create_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

create function public.mark_conversation_read(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations
  set a_read_at = case when user_a = auth.uid() then now() else a_read_at end,
      b_read_at = case when user_b = auth.uid() then now() else b_read_at end
  where id = p_id and auth.uid() in (user_a, user_b);
$$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create function public.unread_conversations_count()
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::int from public.conversations c
  where c.last_message_at is not null
    and c.last_sender_id is distinct from auth.uid()
    and c.last_message_at > coalesce(case when c.user_a = auth.uid() then c.a_read_at else c.b_read_at end, '-infinity');
$$;
revoke execute on function public.unread_conversations_count() from public, anon;
grant execute on function public.unread_conversations_count() to authenticated;

-- Realtime (RLS applies to subscribers).
alter publication supabase_realtime add table public.messages, public.conversations;
