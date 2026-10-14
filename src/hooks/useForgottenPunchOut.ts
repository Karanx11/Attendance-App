import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAttendanceRange } from '@/services/attendance'
import type { AttendanceRecord } from '@/types'
import { fromDateKey, toDateKey, todayKey } from '@/utils/date'
import { EDIT_LOCK_DAYS } from '@/utils/editLock'

/**
 * Finds a *past* day (within the still-editable window) that has a punch-in but
 * no punch-out — i.e. a shift you forgot to close. Only looks at the last
 * `EDIT_LOCK_DAYS` days, since older records are locked and can't be fixed.
 */
export function useForgottenPunchOut() {
  const { user } = useAuth()
  const [pending, setPending] = useState<AttendanceRecord | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setPending(null)
      return
    }
    const today = todayKey()
    const base = fromDateKey(today)
    const start = toDateKey(
      new Date(base.getFullYear(), base.getMonth(), base.getDate() - EDIT_LOCK_DAYS)
    )
    const end = toDateKey(
      new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1)
    )
    try {
      const recs = await getAttendanceRange(user.id, start, end)
      const open = recs
        .filter(
          (r) =>
            r.attendance_date < today &&
            r.punch_in &&
            !r.punch_out &&
            r.status !== 'Leave'
        )
        .sort((a, b) => (a.attendance_date < b.attendance_date ? 1 : -1))[0] ?? null
      setPending(open)
    } catch {
      /* best-effort — offline / transient */
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const dismiss = useCallback(() => setPending(null), [])

  return { pending, refresh, dismiss }
}
