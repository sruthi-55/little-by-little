-- Run once in Supabase SQL Editor. These policies keep each account's history private.
create table if not exists public.habit_events (
  id uuid primary key,
  seq bigint generated always as identity unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists habit_events_owner_seq on public.habit_events(user_id,seq);
alter table public.habit_events enable row level security;
revoke all on public.habit_events from anon;
revoke all on public.habit_events from authenticated;
grant select, insert on public.habit_events to authenticated;
grant usage on sequence public.habit_events_seq_seq to authenticated;
create policy "Read own events" on public.habit_events for select to authenticated using (auth.uid() = user_id);
create policy "Append own events" on public.habit_events for insert to authenticated with check (auth.uid() = user_id);
