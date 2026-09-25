import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/Toast/ToastProvider'
import { getAttendanceForDate } from '@/services/attendance'
import type { AttendanceRecord } from '@/types'
import { todayKey } from '@/utils/date'
import { getShiftAlarm, SHIFT_MINUTES } from '@/utils/reminder'
import { playChime, primeAudio } from '@/utils/chime'

const SHIFT_MS = SHIFT_MINUTES * 60 * 1000
const CHECK_INTERVAL = 30_000 // how often to check the clock
const REFETCH_INTERVAL = 5 * 60_000 // how often to re-read today's record

/**
 * Plays a chime once when 8 hours have elapsed since today's punch-in (and the
 * user hasn't punched out yet). Runs app-wide while a tab is open. The
 * "already fired" flag is stored per-day so a reload doesn't replay it.
 */
export function useShiftAlarm(): void {
  const { user } = useAuth()
  const toast = useToast()

  const recRef = useRef<AttendanceRecord | null>(null)
  const lastFetch = useRef(0)

  // Unlock audio on the first user interaction so the chime isn't blocked.
  useEffect(() => {
    const unlock = () => primeAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      try {
        const rec = await getAttendanceForDate(user.id, todayKey())
        if (!cancelled) {
          recRef.current = rec
          lastFetch.current = Date.now()
        }
      } catch {
        /* offline / transient — try again next cycle */
      }
    }

    void load()

    const id = window.setInterval(() => {
      void (async () => {
        if (Date.now() - lastFetch.current > REFETCH_INTERVAL) await load()
        if (!getShiftAlarm()) return

        const rec = recRef.current
        if (!rec?.punch_in || rec.punch_out || rec.status === 'Leave') return

        const target = new Date(rec.punch_in).getTime() + SHIFT_MS
        const doneKey = `shift-alarm-done:${rec.attendance_date}`
        let alreadyDone = false
        try {
          alreadyDone = localStorage.getItem(doneKey) === '1'
        } catch {
          /* ignore */
        }

        if (!alreadyDone && Date.now() >= target) {
          try {
            localStorage.setItem(doneKey, '1')
          } catch {
            /* ignore */
          }
          playChime()
          toast.success('8 hours complete — you can head home! 🎉')
        }
      })()
    }, CHECK_INTERVAL)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [user, toast])
}
