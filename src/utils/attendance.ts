import type {
  AttendanceRecord,
  DayInfo,
  DayKind,
  Holiday,
  MonthStats,
  Profile,
} from '@/types'
import {
  eachDateKey,
  fromDateKey,
  isFutureKey,
  isPastKey,
  isTodayKey,
  isWeekendKey,
  minutesSinceMidnight,
  todayKey,
} from './date'

/** Working time in whole minutes between two ISO timestamps. */
export function calcTotalMinutes(punchIn: string, punchOut: string): number {
  const start = new Date(punchIn).getTime()
  const end = new Date(punchOut).getTime()
  return Math.max(0, Math.round((end - start) / 60000))
}

/** Is `key` a working day for this user? Considers weekend + holiday + settings. */
export function isWorkingDay(
  key: string,
  holidays: Set<string>,
  workingDays: number[]
): boolean {
  if (holidays.has(key)) return false
  const dow = fromDateKey(key).getDay()
  return workingDays.includes(dow)
}

/**
 * Resolve how a single day should be treated for stats & rendering.
 * Precedence: an existing record (Present/WFH/Leave) always wins over
 * weekend/holiday coloring.
 */
export function resolveDayKind(
  key: string,
  record: AttendanceRecord | null,
  holiday: Holiday | null,
  workingDays: number[]
): DayKind {
  if (record) {
    if (record.status === 'Present') return 'present'
    if (record.status === 'WFH') return 'wfh'
    if (record.status === 'Leave') return 'leave'
  }
  if (holiday) return 'holiday'

  const dow = fromDateKey(key).getDay()
  const isWorkDow = workingDays.includes(dow)
  if (!isWorkDow) return 'weekend'

  if (isFutureKey(key)) return 'future'
  if (isTodayKey(key)) return 'today'
  if (isPastKey(key)) return 'absent' // past working day, no record
  return 'unmarked'
}

/** Build DayInfo objects for a date range, ready to render/aggregate. */
export function buildDayInfos(
  keys: string[],
  recordsByDate: Map<string, AttendanceRecord>,
  holidaysByDate: Map<string, Holiday>,
  workingDays: number[]
): DayInfo[] {
  const today = todayKey()
  return keys.map((key) => {
    const record = recordsByDate.get(key) ?? null
    const holiday = holidaysByDate.get(key) ?? null
    return {
      date: key,
      kind: resolveDayKind(key, record, holiday, workingDays),
      record,
      holiday,
      isWeekend: isWeekendKey(key),
      isToday: key === today,
      isFuture: key > today,
    }
  })
}

/** Aggregate stats for a date range (inclusive). */
export function computeStats(
  start: string,
  end: string,
  recordsByDate: Map<string, AttendanceRecord>,
  holidays: Set<string>,
  workingDays: number[]
): MonthStats {
  const keys = eachDateKey(start, end)

  let present = 0
  let wfh = 0
  let leave = 0
  let absent = 0
  let workingDays_ = 0

  const punchIns: number[] = []
  const punchOuts: number[] = []
  const workMinutes: number[] = []

  for (const key of keys) {
    const record = recordsByDate.get(key)
    const working = isWorkingDay(key, holidays, workingDays)
    if (working && !isFutureKey(key)) workingDays_++

    if (record) {
      if (record.status === 'Present') present++
      else if (record.status === 'WFH') wfh++
      else if (record.status === 'Leave') leave++

      if (record.punch_in) punchIns.push(minutesSinceMidnight(record.punch_in))
      if (record.punch_out) punchOuts.push(minutesSinceMidnight(record.punch_out))
      if (record.total_minutes != null && record.total_minutes > 0) {
        workMinutes.push(record.total_minutes)
      }
    } else if (working && isPastKey(key)) {
      // Past working day with no record → absent (weekends/holidays/future excluded)
      absent++
    }
  }

  const attended = present + wfh
  // Attendance % = days you showed up (or on approved leave counts as accounted)
  // relative to working days that have passed. Absent hurts the ratio.
  const denominator = workingDays_
  const attendancePercent =
    denominator > 0 ? Math.round(((attended + leave) / denominator) * 100) : 0

  const avg = (arr: number[]): number | null =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null

  return {
    present,
    wfh,
    leave,
    absent,
    workingDays: workingDays_,
    attendancePercent,
    avgPunchInMinutes: avg(punchIns),
    avgPunchOutMinutes: avg(punchOuts),
    avgWorkingMinutes: avg(workMinutes),
  }
}

export function toRecordMap(records: AttendanceRecord[]): Map<string, AttendanceRecord> {
  const map = new Map<string, AttendanceRecord>()
  for (const r of records) map.set(r.attendance_date, r)
  return map
}

export function toHolidayMap(holidays: Holiday[]): Map<string, Holiday> {
  const map = new Map<string, Holiday>()
  for (const h of holidays) map.set(h.holiday_date, h)
  return map
}

export function workingDaysOf(profile: Profile | null): number[] {
  return profile?.working_days && profile.working_days.length > 0
    ? profile.working_days
    : [1, 2, 3, 4, 5]
}
