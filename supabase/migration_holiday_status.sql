-- Allow 'Holiday' as an attendance status (mark a day as a holiday with a
-- reason in notes). Safe to run more than once.
-- Run in Supabase → SQL Editor.

alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance
  add constraint attendance_status_check
  check (status in ('Present', 'WFH', 'Leave', 'Holiday'));

notify pgrst, 'reload schema';
