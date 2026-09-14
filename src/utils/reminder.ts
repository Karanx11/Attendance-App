/**
 * Punch-in reminder preferences (stored per-browser in localStorage) plus
 * small helpers shared by the Home banner and the notification hook.
 *
 * Note: browser notifications only fire while the app is open in a tab.
 * True background/scheduled notifications would require installing the app
 * (PWA) with a push server, which this project intentionally does not use.
 */

const TIME_KEY = 'punch-reminder-time'
const NOTIFY_KEY = 'punch-reminder-notify'
const DISMISS_KEY = 'punch-reminder-dismissed'
const NOTIFIED_KEY = 'punch-reminder-notified'

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

export function getNotifyEnabled(): boolean {
  return read(NOTIFY_KEY) === '1'
}
export function setNotifyEnabled(v: boolean): void {
  write(NOTIFY_KEY, v ? '1' : '0')
}

export function isDismissedToday(dateKey: string): boolean {
  return read(DISMISS_KEY) === dateKey
}
export function dismissToday(dateKey: string): void {
  write(DISMISS_KEY, dateKey)
}

export function wasNotifiedToday(dateKey: string): boolean {
  return read(NOTIFIED_KEY) === dateKey
}
export function markNotifiedToday(dateKey: string): void {
  try {
    localStorage.setItem(NOTIFIED_KEY, dateKey)
  } catch {
    /* ignore */
  }
}

/** 'HH:MM' → minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** Are browser notifications supported here? */
export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}
