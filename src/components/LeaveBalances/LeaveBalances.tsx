import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pencil, Plane, X } from 'lucide-react'
import type { AttendanceRecord } from '@/types'
import { Skeleton } from '../ui/Skeleton'
import { LEAVE_TYPES, countLeaveByType, getLeaveQuotas, setLeaveQuotas } from '@/utils/leave'

interface Props {
  year: number
  /** All attendance records for the year. */
  records: AttendanceRecord[]
  loading: boolean
  onPrevYear: () => void
  onNextYear: () => void
  canGoNext: boolean
}

export function LeaveBalances({
  year,
  records,
  loading,
  onPrevYear,
  onNextYear,
  canGoNext,
}: Props) {
  const [quotas, setQuotas] = useState(getLeaveQuotas())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(quotas)

  const used = useMemo(() => countLeaveByType(records), [records])

  const totalUsed = LEAVE_TYPES.reduce((s, t) => s + used[t], 0)

  const startEdit = () => {
    setDraft(quotas)
    setEditing(true)
  }
  const saveEdit = () => {
    setLeaveQuotas(draft)
    setQuotas(draft)
    setEditing(false)
  }

  return (
    <div className="space-y-5">
      {/* Year switcher + total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevYear}
            aria-label="Previous year"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[4ch] text-center text-lg font-extrabold text-slate-800">
            {year}
          </span>
          <button
            type="button"
            onClick={onNextYear}
            disabled={!canGoNext}
            aria-label="Next year"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {editing ? (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button className="btn-primary" onClick={saveEdit}>
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={startEdit}>
            <Pencil className="h-4 w-4" />
            Edit quotas
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="glass-card flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#800000]/10 text-[#800000]">
          <Plane className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total leave taken in {year}
          </p>
          <p className="text-2xl font-extrabold text-slate-800">
            {loading ? '—' : totalUsed}
            <span className="ml-1 text-sm font-medium text-slate-400">
              day{totalUsed === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      </div>

      {/* Per-type cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LEAVE_TYPES.map((t) => (
            <Skeleton key={t} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LEAVE_TYPES.map((type) => {
            const u = used[type]
            const quota = quotas[type]
            const hasQuota = quota > 0
            const over = hasQuota && u > quota
            const pct = hasQuota ? Math.min(100, Math.round((u / quota) * 100)) : 0
            return (
              <div key={type} className="glass-card-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{type}</p>
                    {editing ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          className="input w-20 py-1.5"
                          value={draft[type]}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              [type]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                        />
                        <span className="text-xs text-slate-400">days / year</span>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {hasQuota ? `${quota} days / year` : 'No limit — tracked only'}
                      </p>
                    )}
                  </div>
                  {!editing && (
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-extrabold leading-none text-slate-800">
                        {u}
                        {hasQuota && (
                          <span className="text-sm font-medium text-slate-400">/{quota}</span>
                        )}
                      </p>
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          over ? 'text-amber-600' : hasQuota ? 'text-green-600' : 'text-slate-400'
                        }`}
                      >
                        {hasQuota
                          ? over
                            ? `${u - quota} over`
                            : `${quota - u} left`
                          : `${u} taken`}
                      </p>
                    </div>
                  )}
                </div>

                {!editing && hasQuota && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${over ? 100 : pct}%`,
                        backgroundColor: over ? '#f59e0b' : '#800000',
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Quotas are per-year and saved on this device. Edit them anytime above.
      </p>
    </div>
  )
}
