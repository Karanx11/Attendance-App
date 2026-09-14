/**
 * Date helpers. All "date keys" are local-calendar 'YYYY-MM-DD' strings so a
 * punch at 11pm never lands on the wrong day. Timestamps stored in the DB are
 * always full ISO (UTC via TIMESTAMPTZ) and displayed in local time.
 */

/** Local 'YYYY-MM-DD' for a Date (NOT toISOString, which is UTC). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a 'YYYY-MM-DD' key into a local Date at midnight. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function isWeekendDate(d: Date): boolean {
  const day = d.getDay() // 0=Sun, 6=Sat
  return day === 0 || day === 6
}

export function isWeekendKey(key: string): boolean {
  return isWeekendDate(fromDateKey(key))
}

/** Compare only the calendar date (ignores time). */
export function isFutureKey(key: string, ref: Date = new Date()): boolean {
  return key > toDateKey(ref)
}

export function isPastKey(key: string, ref: Date = new Date()): boolean {
  return key < toDateKey(ref)
}

export function isTodayKey(key: string): boolean {
  return key === todayKey()
}

/** First and last date keys of a month. `month` is 0-based. */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { start: toDateKey(start), end: toDateKey(end) }
}

/** All date keys in [start, end] inclusive. */
export function eachDateKey(start: string, end: string): string[] {
  const out: string[] = []
  const cur = fromDateKey(start)
  const last = fromDateKey(end)
  while (cur <= last) {
    out.push(toDateKey(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]

/** e.g. "Monday, 14 September" */
export function formatLongDate(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** e.g. "14 September 2026" from a date key */
export function formatFullDate(key: string): string {
  const d = fromDateKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** e.g. "14 Sep" from a date key */
export function formatShortDate(key: string): string {
  const d = fromDateKey(key)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`
}

/** Full weekday name from a date key, e.g. "Monday". */
export function formatWeekday(key: string): string {
  return WEEKDAYS[fromDateKey(key).getDay()]
}

/** Month + year from a date key, e.g. "July 2026". */
export function formatMonthName(key: string): string {
  const d = fromDateKey(key)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** ISO date key as-is 'YYYY-MM-DD' (kept for clarity in exports). */
export function isoDate(key: string): string {
  return key
}

/** Local time like "09:08 AM" from an ISO timestamp. */
export function formatTime(iso: string | null): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  let h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Minutes since local midnight for an ISO timestamp (for averaging). */
export function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

/** "09h 24m" from a minutes count. */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes < 0) return '--'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

/** "09:12 AM" from minutes-since-midnight (for averaged punch times). */
export function formatTimeFromMinutes(minutes: number | null): string {
  if (minutes == null) return '--:--'
  let h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

/** 'HH:MM' (local, 24h) for an ISO timestamp — for <input type="time"> values. */
export function toTimeInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Combine a 'YYYY-MM-DD' key and 'HH:MM' local time into an ISO timestamp. */
export function combineDateTime(dateKey: string, hhmm: string): string | null {
  if (!hhmm) return null
  const [y, m, d] = dateKey.split('-').map(Number)
  const [hh, mm] = hhmm.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString()
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export { MONTHS, MONTHS_SHORT, WEEKDAYS }
