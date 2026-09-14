-- ============================================================================
--  Personal Attendance Tracker — Supabase schema
--  Run this in:  Supabase Dashboard → SQL Editor → New query → Run
--  It is idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Tables
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references auth.users (id) on delete cascade,
  name       text,
  email      text,
  -- Personal preferences (informational only, no GPS/tracking)
  working_days   integer[] default '{1,2,3,4,5}',  -- 0=Sun .. 6=Sat
  office_name    text,
  office_location text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.attendance (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  attendance_date date not null,
  status          text not null check (status in ('Present', 'WFH', 'Leave')),
  punch_in        timestamptz,
  punch_out       timestamptz,
  total_minutes   integer,
  leave_type      text check (leave_type in ('Casual', 'Sick', 'Personal', 'Other')),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, attendance_date)
);

create index if not exists attendance_user_date_idx
  on public.attendance (user_id, attendance_date);

create table if not exists public.holidays (
  id           uuid primary key default gen_random_uuid(),
  holiday_date date not null,
  holiday_name text not null,
  country      text default 'India',
  created_at   timestamptz default now(),
  unique (holiday_date, country)
);

-- ----------------------------------------------------------------------------
--  updated_at trigger
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at
  before update on public.attendance
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
--  Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.attendance enable row level security;
alter table public.holidays   enable row level security;

-- profiles: a user only ever touches their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- attendance: full CRUD but scoped to the authenticated user
drop policy if exists "attendance_select_own" on public.attendance;
create policy "attendance_select_own"
  on public.attendance for select
  using (auth.uid() = user_id);

drop policy if exists "attendance_insert_own" on public.attendance;
create policy "attendance_insert_own"
  on public.attendance for insert
  with check (auth.uid() = user_id);

drop policy if exists "attendance_update_own" on public.attendance;
create policy "attendance_update_own"
  on public.attendance for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "attendance_delete_own" on public.attendance;
create policy "attendance_delete_own"
  on public.attendance for delete
  using (auth.uid() = user_id);

-- holidays: readable by any authenticated user (managed via dashboard/SQL)
drop policy if exists "holidays_select_authenticated" on public.holidays;
create policy "holidays_select_authenticated"
  on public.holidays for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
--  Auto-create a profile row when a new auth user is created
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
--  Seed: Indian public holidays (2025 & 2026). Edit freely.
-- ----------------------------------------------------------------------------

insert into public.holidays (holiday_date, holiday_name, country) values
  ('2025-01-01', 'New Year''s Day', 'India'),
  ('2025-01-26', 'Republic Day', 'India'),
  ('2025-03-14', 'Holi', 'India'),
  ('2025-03-31', 'Id-ul-Fitr', 'India'),
  ('2025-04-14', 'Dr. Ambedkar Jayanti', 'India'),
  ('2025-04-18', 'Good Friday', 'India'),
  ('2025-05-01', 'May Day', 'India'),
  ('2025-08-15', 'Independence Day', 'India'),
  ('2025-08-27', 'Ganesh Chaturthi', 'India'),
  ('2025-10-02', 'Gandhi Jayanti', 'India'),
  ('2025-10-20', 'Diwali', 'India'),
  ('2025-11-05', 'Guru Nanak Jayanti', 'India'),
  ('2025-12-25', 'Christmas', 'India'),
  ('2026-01-01', 'New Year''s Day', 'India'),
  ('2026-01-26', 'Republic Day', 'India'),
  ('2026-03-04', 'Holi', 'India'),
  ('2026-03-21', 'Id-ul-Fitr', 'India'),
  ('2026-04-03', 'Good Friday', 'India'),
  ('2026-04-14', 'Dr. Ambedkar Jayanti', 'India'),
  ('2026-05-01', 'May Day', 'India'),
  ('2026-08-15', 'Independence Day', 'India'),
  ('2026-09-14', 'Ganesh Chaturthi', 'India'),
  ('2026-10-02', 'Gandhi Jayanti', 'India'),
  ('2026-11-08', 'Diwali', 'India'),
  ('2026-11-24', 'Guru Nanak Jayanti', 'India'),
  ('2026-12-25', 'Christmas', 'India')
on conflict (holiday_date, country) do nothing;
