import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { useRangeData } from '@/hooks/useRangeData'
import { ShareReport } from '@/components/ShareReport/ShareReport'
import { StatCard } from '@/components/StatCard/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  formatDuration,
  formatFullDate,
  formatShortDate,
  formatTime,
  monthRange,
  todayKey,
} from '@/utils/date'

type Preset = 'current' | 'previous' | 'custom'

function presetRange(preset: Preset): { start: string; end: string } {
  const now = new Date()
  if (preset === 'previous') {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    return monthRange(y, m)
  }
  return monthRange(now.getFullYear(), now.getMonth())
}

const STATUS_BADGE: Record<string, string> = {
  Present: 'bg-green-100 text-green-700',
  WFH: 'bg-brand-100 text-brand-700',
  Leave: 'bg-[#800000]/10 text-[#800000]',
}

export function Reports() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const [preset, setPreset] = useState<Preset>('current')
  const [customFrom, setCustomFrom] = useState(monthRange(new Date().getFullYear(), new Date().getMonth()).start)
  const [customTo, setCustomTo] = useState(todayKey())

  const { start, end, rangeError } = useMemo(() => {
    if (preset === 'custom') {
      if (customFrom > customTo) {
        return { start: customFrom, end: customFrom, rangeError: 'From date is after To date.' }
      }
      return { start: customFrom, end: customTo, rangeError: null as string | null }
    }
    const r = presetRange(preset)
    return { start: r.start, end: r.end, rangeError: null as string | null }
  }, [preset, customFrom, customTo])

  const { records, stats, loading } = useRangeData(start, end)
  const personName = profile?.name || user?.email?.split('@')[0] || 'User'

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Reports
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and export your attendance history.
        </p>
      </header>

      {/* Filters */}
      <div className="glass-card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              ['current', 'Current Month'],
              ['previous', 'Previous Month'],
              ['custom', 'Custom Range'],
            ] as [Preset, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                preset === key
                  ? 'bg-brand-600 text-white shadow-glass-sm'
                  : 'bg-white/70 text-slate-600 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="from">From</label>
              <input
                id="from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="to">To</label>
              <input
                id="to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}

        {rangeError && (
          <p className="mt-2 text-sm font-medium text-red-600">{rangeError}</p>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Working Days" value={loading ? '—' : stats.workingDays} />
        <StatCard label="Present" value={loading ? '—' : stats.present} accent="text-green-600" iconBg="bg-green-50" />
        <StatCard label="WFH" value={loading ? '—' : stats.wfh} accent="text-brand-600" iconBg="bg-brand-50" />
        <StatCard label="Leave" value={loading ? '—' : stats.leave} accent="text-[#800000]" iconBg="bg-[#800000]/10" />
        <StatCard label="Absent" value={loading ? '—' : stats.absent} accent="text-amber-600" iconBg="bg-amber-50" />
        <StatCard label="Attendance" value={loading ? '—' : `${stats.attendancePercent}%`} />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">Attendance</h2>
          <p className="text-sm text-slate-500">
            {formatFullDate(start)} — {formatFullDate(end)}
          </p>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No attendance records in this range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Punch In</th>
                  <th className="px-3 py-3 font-semibold">Punch Out</th>
                  <th className="px-5 py-3 font-semibold">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 transition hover:bg-brand-50/40"
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-700">
                      {formatShortDate(r.attendance_date)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status}
                        {r.status === 'Leave' && r.leave_type ? ` · ${r.leave_type}` : ''}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {r.punch_in ? formatTime(r.punch_in) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {r.punch_out ? formatTime(r.punch_out) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-700">
                      {r.total_minutes != null ? formatDuration(r.total_minutes) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share / export */}
      <ShareReport defaultFrom={start} defaultTo={end} personName={personName} />
    </div>
  )
}
