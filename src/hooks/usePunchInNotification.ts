import { useEffect, useRef } from 'react'
import { todayKey } from '@/utils/date'
import {
  getNotifyEnabled,
  getReminderTime,
  markNotifiedToday,
  nowMinutes,
  timeToMinutes,
  wasNotifiedToday,
} from '@/utils/reminder'

/**
 * While the app is open, fires a single browser notification per day at (or
 * after) the reminder time when `shouldRemind()` is true — i.e. it's a working
 * day and today's punch-in is still missing. Checks every minute and once on
 * mount, so opening the app after 10am also triggers it.
 */
export function usePunchInNotification(shouldRemind: () => boolean): void {
  const ref = useRef(shouldRemind)
  ref.current = shouldRemind

  useEffect(() => {
    const tick = () => {
      if (!getNotifyEnabled()) return
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const today = todayKey()
      if (wasNotifiedToday(today)) return
      if (nowMinutes() < timeToMinutes(getReminderTime())) return
      if (!ref.current()) return

      try {
        const n = new Notification('Punch in reminder ⏰', {
          body: "You haven't punched in yet today. Open the app to mark your attendance.",
          tag: 'punch-in-reminder',
        })
        n.onclick = () => {
          window.focus()
          n.close()
        }
        markNotifiedToday(today)
      } catch {
        /* ignore notification failures */
      }
    }

    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])
}
