import { fromDateKey, todayKey } from './date'

/**
 * Attendance for a date can be edited for this many days after it. Once a date
 * is older than this, its record is locked (no editing punch in/out, status,
 * leave, notes — and no back-dated new entries). Enforced in the UI and by a
 * database trigger (see supabase/migration_lock_edits.sql).
 */
export const EDIT_LOCK_DAYS = 2

/** Whole days elapsed from `dateKey` to today (0 = today, negative = future). */
export function daysSince(dateKey: string, today: string = todayKey()): number {
  const a = fromDateKey(dateKey).getTime()
  const b = fromDateKey(today).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** True once a date is older than the edit window and can no longer be changed. */
export function isEditLocked(dateKey: string): boolean {
  return daysSince(dateKey) > EDIT_LOCK_DAYS
}
