import { supabase } from '@/lib/supabase'
import type {
  AttendanceEditInput,
  AttendanceRecord,
  AttendanceStatus,
  Holiday,
  LeaveType,
  Profile,
} from '@/types'
import { calcTotalMinutes } from '@/utils/attendance'
import { todayKey } from '@/utils/date'

/** Turn a raw Supabase error into a friendly message (never leak SQL). */
export function friendlyError(err: unknown, fallback = 'Something went wrong.'): string {
  const msg = (err as { message?: string })?.message ?? ''
  const code = (err as { code?: string })?.code ?? ''
  if (code === '23505' || /duplicate key/i.test(msg)) {
    return 'An attendance record already exists for this day.'
  }
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) {
    return 'Cannot reach the server. Check your connection and try again.'
  }
  if (/JWT|not authenticated|Auth session missing/i.test(msg)) {
    return 'Your session has expired. Please sign in again.'
  }
  if (/Invalid login credentials/i.test(msg)) {
    return 'Incorrect email or password.'
  }
  if (/Email not confirmed/i.test(msg)) {
    return 'This email has not been confirmed yet.'
  }
  return msg && msg.length < 120 ? msg : fallback
}

// ── Profile ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function ensureProfile(
  userId: string,
  email: string | null
): Promise<Profile> {
  const existing = await getProfile(userId)
  if (existing) return existing
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      email,
      name: email ? email.split('@')[0] : null,
      working_days: [1, 2, 3, 4, 5],
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<Profile, 'name' | 'working_days' | 'office_name' | 'office_location'>
  >
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

// ── Holidays ─────────────────────────────────────────────────────────────

export async function getHolidays(start: string, end: string): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .gte('holiday_date', start)
    .lte('holiday_date', end)
    .order('holiday_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as Holiday[]
}

// ── Attendance reads ─────────────────────────────────────────────────────

export async function getAttendanceRange(
  userId: string,
  start: string,
  end: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .gte('attendance_date', start)
    .lte('attendance_date', end)
    .order('attendance_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as AttendanceRecord[]
}

export async function getAttendanceForDate(
  userId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .eq('attendance_date', date)
    .maybeSingle()
  if (error) throw error
  return data as AttendanceRecord | null
}

// ── Attendance writes ────────────────────────────────────────────────────

/**
 * Punch in for TODAY. Validates: no future punch-in, no double punch-in.
 * Uses upsert on (user_id, attendance_date) to avoid duplicate rows, but
 * fails loudly if a record already has a punch_in.
 */
export async function punchIn(
  userId: string,
  status: 'Present' | 'WFH' = 'Present'
): Promise<AttendanceRecord> {
  const date = todayKey()
  const existing = await getAttendanceForDate(userId, date)

  if (existing?.punch_in) {
    throw new Error('You have already punched in today.')
  }
  if (existing?.status === 'Leave') {
    throw new Error('Today is marked as Leave. Clear it before punching in.')
  }

  const now = new Date().toISOString()

  if (existing) {
    const { data, error } = await supabase
      .from('attendance')
      .update({ status, punch_in: now, leave_type: null })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw error
    return data as AttendanceRecord
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      user_id: userId,
      attendance_date: date,
      status,
      punch_in: now,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as AttendanceRecord
}

/** Punch out for TODAY. Validates punch-in exists and no double punch-out. */
export async function punchOut(userId: string): Promise<AttendanceRecord> {
  const date = todayKey()
  const existing = await getAttendanceForDate(userId, date)

  if (!existing || !existing.punch_in) {
    throw new Error('You need to punch in before punching out.')
  }
  if (existing.punch_out) {
    throw new Error('You have already punched out today.')
  }

  const now = new Date().toISOString()
  if (new Date(now).getTime() < new Date(existing.punch_in).getTime()) {
    throw new Error('Punch out cannot be before punch in.')
  }

  const total = calcTotalMinutes(existing.punch_in, now)

  const { data, error } = await supabase
    .from('attendance')
    .update({ punch_out: now, total_minutes: total })
    .eq('id', existing.id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as AttendanceRecord
}

/** Set today's mode (Office=Present / WFH) before punching in. */
export async function setTodayMode(
  userId: string,
  status: 'Present' | 'WFH'
): Promise<AttendanceRecord> {
  const date = todayKey()
  const existing = await getAttendanceForDate(userId, date)

  if (existing) {
    if (existing.status === 'Leave') {
      throw new Error('Today is marked as Leave. Clear it first.')
    }
    const { data, error } = await supabase
      .from('attendance')
      .update({ status })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw error
    return data as AttendanceRecord
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({ user_id: userId, attendance_date: date, status })
    .select('*')
    .single()
  if (error) throw error
  return data as AttendanceRecord
}

/** Mark a day (default today) as Leave. Clears any punch times. */
export async function markLeave(
  userId: string,
  date: string,
  leaveType: LeaveType,
  notes: string | null
): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        user_id: userId,
        attendance_date: date,
        status: 'Leave' as AttendanceStatus,
        leave_type: leaveType,
        notes,
        punch_in: null,
        punch_out: null,
        total_minutes: null,
      },
      { onConflict: 'user_id,attendance_date' }
    )
    .select('*')
    .single()
  if (error) throw error
  return data as AttendanceRecord
}

/**
 * Create or edit a single day's attendance from the UI (status + editable
 * punch in/out times). Recomputes total_minutes from the timestamps.
 */
export async function saveAttendanceEdit(
  userId: string,
  date: string,
  edit: AttendanceEditInput
): Promise<AttendanceRecord> {
  const row: Record<string, unknown> = {
    user_id: userId,
    attendance_date: date,
    status: edit.status,
    notes: edit.notes,
  }

  if (edit.status === 'Leave') {
    row.leave_type = edit.leaveType
    row.punch_in = null
    row.punch_out = null
    row.total_minutes = null
  } else {
    row.leave_type = null
    row.punch_in = edit.punchIn
    row.punch_out = edit.punchOut
    if (edit.punchIn && edit.punchOut) {
      if (new Date(edit.punchOut).getTime() < new Date(edit.punchIn).getTime()) {
        throw new Error('Punch out cannot be before punch in.')
      }
      row.total_minutes = calcTotalMinutes(edit.punchIn, edit.punchOut)
    } else {
      row.total_minutes = null
    }
  }

  const { data, error } = await supabase
    .from('attendance')
    .upsert(row, { onConflict: 'user_id,attendance_date' })
    .select('*')
    .single()
  if (error) throw error
  return data as AttendanceRecord
}

/**
 * Bulk-insert historical attendance. Uses ignoreDuplicates so it never
 * overwrites a day you have already recorded (e.g. today's punch-in).
 * Returns how many new days were inserted.
 */
export async function bulkImportAttendance(
  userId: string,
  rows: {
    date: string
    status: AttendanceStatus
    leaveType?: LeaveType | null
    notes?: string | null
  }[]
): Promise<number> {
  const payload = rows.map((r) => ({
    user_id: userId,
    attendance_date: r.date,
    status: r.status,
    leave_type: r.leaveType ?? null,
    notes: r.notes ?? null,
  }))
  const { data, error } = await supabase
    .from('attendance')
    .upsert(payload, {
      onConflict: 'user_id,attendance_date',
      ignoreDuplicates: true,
    })
    .select('attendance_date')
  if (error) throw error
  return data?.length ?? 0
}

/** Remove an attendance record entirely (e.g. clear a mistaken mark). */
export async function deleteAttendance(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}
