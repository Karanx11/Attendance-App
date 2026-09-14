-- ============================================================================
--  Attendance data import for Karan Sharma
--  Source: Karan-Sharma-Attendance.xlsx  (27 Jul 2026 - 14 Sep 2026)
--  Records: 36  (Present: 27, WFH: 3, Leave: 6)
--
--  HOW TO RUN:
--    1. Make sure supabase/schema.sql has already been run (tables must exist).
--    2. Make sure your user exists in Authentication -> Users, and that the
--       email below matches it. Change it here if different.
--    3. Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
--
--  Safe to re-run: existing days are updated, not duplicated (upsert).
--  Weekends (Sat/Sun) are intentionally omitted - the app colours them
--  automatically. Leave days have no type set; edit them in the app if needed.
-- ============================================================================

with me as (
  select id as user_id
  from auth.users
  where lower(email) = lower('int-Karan@channelplay.in')
)
insert into public.attendance (user_id, attendance_date, status, leave_type)
select me.user_id, v.attendance_date, v.status, v.leave_type
from me
cross join (values
    ('2026-07-27'::date, 'Present', null),
    ('2026-07-28'::date, 'Present', null),
    ('2026-07-29'::date, 'Present', null),
    ('2026-07-30'::date, 'Present', null),
    ('2026-07-31'::date, 'Present', null),
    ('2026-08-03'::date, 'Present', null),
    ('2026-08-04'::date, 'Present', null),
    ('2026-08-05'::date, 'Present', null),
    ('2026-08-06'::date, 'Present', null),
    ('2026-08-07'::date, 'Present', null),
    ('2026-08-10'::date, 'Present', null),
    ('2026-08-11'::date, 'WFH', null),
    ('2026-08-12'::date, 'Leave', null),
    ('2026-08-13'::date, 'Leave', null),
    ('2026-08-14'::date, 'WFH', null),
    ('2026-08-17'::date, 'Leave', null),
    ('2026-08-18'::date, 'WFH', null),
    ('2026-08-19'::date, 'Present', null),
    ('2026-08-20'::date, 'Present', null),
    ('2026-08-21'::date, 'Present', null),
    ('2026-08-24'::date, 'Present', null),
    ('2026-08-25'::date, 'Present', null),
    ('2026-08-26'::date, 'Present', null),
    ('2026-08-27'::date, 'Present', null),
    ('2026-08-28'::date, 'Present', null),
    ('2026-08-31'::date, 'Present', null),
    ('2026-09-01'::date, 'Present', null),
    ('2026-09-02'::date, 'Present', null),
    ('2026-09-03'::date, 'Present', null),
    ('2026-09-04'::date, 'Leave', null),
    ('2026-09-07'::date, 'Present', null),
    ('2026-09-08'::date, 'Present', null),
    ('2026-09-09'::date, 'Present', null),
    ('2026-09-10'::date, 'Leave', null),
    ('2026-09-11'::date, 'Leave', null),
    ('2026-09-14'::date, 'Present', null)
) as v(attendance_date, status, leave_type)
on conflict (user_id, attendance_date) do update
  set status     = excluded.status,
      leave_type = excluded.leave_type,
      updated_at = now();

-- Mark the joining date (27 Jul 2026)
update public.attendance
set notes = 'Joining Date'
where attendance_date = '2026-07-27'
  and user_id = (
    select id from auth.users
    where lower(email) = lower('int-Karan@channelplay.in')
  );

-- Verify:
--   select attendance_date, status from public.attendance order by attendance_date;
