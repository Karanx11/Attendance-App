import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plane } from 'lucide-react'
import type { AttendanceRecord } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { getYearLeave } from '@/services/attendance'
import { LEAVE_TYPES, countLeaveByType, getLeaveQuotas } from '@/utils/leave'

type LeaveRow = Pick<AttendanceRecord, 'status' | 'leave_type'>

/**
 * Compact "leave left this year" card for the Home screen. Self-fetches a tiny
 * leave-only query (kept off the Home initial-load critical path). Links to
 * Balances.
 */
export function LeaveSummary() {
  const { user } = useAuth()
  const [rows, setRows] = useState<LeaveRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    getYearLeave(user.id, new Date().getFullYear())
      .then((r) => {
        if (!cancelled) setRows(r)
      })
      .catch(() => {
        /* best-effort */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const quotas = getLeaveQuotas()
  const used = countLeaveByType(rows)
  const types = LEAVE_TYPES.filter((t) => quotas[t] > 0)

  // No quotas configured → nothing useful to show.
  if (types.length === 0) return null

  return (
    <Link
      to="/calendar"
      className="glass-card-soft flex items-center gap-3 p-4 transition hover:-translate-y-0.5"
      aria-label="View leave balances"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/10 text-[#800000]">
        <Plane className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Leave left this year
          </p>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </div>
        {loading ? (
          <p className="mt-1 text-sm text-slate-400">—</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            {types.map((t) => {
              const left = Math.max(0, quotas[t] - used[t])
              return (
                <span key={t} className="text-sm text-slate-700">
                  <span className="font-bold text-slate-800">{left}</span>{' '}
                  <span className="text-slate-400">{t}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </Link>
  )
}
