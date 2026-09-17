/**
 * Punch-in reminder preferences (stored per-browser in localStorage) used by
 * the in-app Home banner. This is a visual nudge only — no browser/push
 * notifications.
 */

const TIME_KEY = 'punch-reminder-time'
const DISMISS_KEY = 'punch-reminder-dismissed'

export const DEFAULT_REMINDER_TIME = '10:00'
/** Fired on any reminder-setting change so open views can re-read it. */
export const REMINDER_EVENT = 'reminder-change'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
    window.dispatchEvent(new Event(REMINDER_EVENT))
  } catch {
    /* ignore */
  }
}

export function getReminderTime(): string {
  return read(TIME_KEY) || DEFAULT_REMINDER_TIME
}
export function setReminderTime(t: string): void {
  write(TIME_KEY, t || DEFAULT_REMINDER_TIME)
}

export function isDismissedToday(dateKey: string): boolean {
  return read(DISMISS_KEY) === dateKey
}
export function dismissToday(dateKey: string): void {
  write(DISMISS_KEY, dateKey)
}

/** 'HH:MM' → minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}
