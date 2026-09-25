-- Web push: stores browser push subscriptions + a per-day "already notified"
-- flag on attendance so the shift-complete notification is sent only once.
-- Safe to run more than once. Run in Supabase → SQL Editor.

-- 1) Push subscriptions (one row per browser/device) --------------------------
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  endpoint     text unique not null,
  subscription jsonb not null,
  created_at   timestamptz default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- 2) One-shot flag so the 8h notification fires once per day -------------------
alter table public.attendance
  add column if not exists shift_notified boolean not null default false;

notify pgrst, 'reload schema';
