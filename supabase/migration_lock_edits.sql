-- Locks attendance edits after 2 days. Blocks UPDATE / DELETE on any attendance
-- row whose date is older than 2 days — enforced in the database for everyone,
-- so punch in/out and other details of a past date can't be changed once the
-- window has passed. INSERT is intentionally allowed so back-filling a missing
-- day and the "Import Attendance History" feature keep working.
-- Run in Supabase → SQL Editor. Safe to run more than once.

create or replace function public.enforce_attendance_edit_lock()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.attendance_date < current_date - 2 then
      raise exception
        'Attendance for % is locked; records can only be changed within 2 days.',
        old.attendance_date using errcode = 'check_violation';
    end if;
    return old;
  end if;

  -- UPDATE: block if the existing row is locked, or if it's being moved onto a
  -- locked date.
  if old.attendance_date < current_date - 2
     or new.attendance_date < current_date - 2 then
    raise exception
      'Attendance for % is locked; records can only be changed within 2 days.',
      old.attendance_date using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_lock_edits on public.attendance;
create trigger attendance_lock_edits
  before update or delete on public.attendance
  for each row execute function public.enforce_attendance_edit_lock();
