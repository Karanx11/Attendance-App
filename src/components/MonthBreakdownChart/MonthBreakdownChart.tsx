import { useMemo } from 'react'
import { PieChart } from 'lucide-react'
import type { DayInfo } from '@/types'

interface Props {
  /** Full month of days (as produced for the calendar). */
  dayInfos: DayInfo[]
}

const SEGMENTS = [
  { key: 'present', label: 'Present', color: '#22c55e' },
  { key: 'wfh', label: 'WFH', color: '#a06f3f' },
  { key: 'leave', label: 'Leave', color: '#800000' },
  { key: 'absent', label: 'Absent', color: '#f59e0b' },
] as const

const R = 46
const CX = 60
const CY = 60
const STROKE = 16
const C = 2 * Math.PI * R

/** Donut chart of the month's attendance: Present / WFH / Leave / Absent. */
export function MonthBreakdownChart({ dayInfos }: Props) {
  const counts = useMemo(() => {
    const c = { present: 0, wfh: 0, leave: 0, absent: 0 }
    for (const d of dayInfos) {
      if (d.record?.status === 'Present') c.present++
      else if (d.record?.status === 'WFH') c.wfh++
      else if (d.record?.status === 'Leave') c.leave++
      else if (d.kind === 'absent') c.absent++
    }
    return c
  }, [dayInfos])

  const total = counts.present + counts.wfh + counts.leave + counts.absent

  // Pre-compute each visible arc's length + starting offset around the ring.
  const arcs = useMemo(() => {
    if (total === 0) return []
    let offset = 0
    const out: { color: string; len: number; offset: number }[] = []
    for (const seg of SEGMENTS) {
      const value = counts[seg.key]
      if (value > 0) {
        const len = (value / total) * C
        out.push({ color: seg.color, len, offset })
        offset += len
      }
    }
    return out
  }, [counts, total])

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-bold text-slate-800">This month</h2>
      </div>

      {total === 0 ? (
        <div className="flex h-[150px] flex-col items-center justify-center text-center text-sm text-slate-400">
          <PieChart className="mb-1.5 h-6 w-6 opacity-40" />
          No attendance recorded this month yet.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <svg
            viewBox="0 0 120 120"
            className="h-28 w-28 shrink-0"
            role="img"
            aria-label={`Attendance breakdown: ${counts.present} present, ${counts.wfh} WFH, ${counts.leave} leave, ${counts.absent} absent.`}
          >
            {/* track */}
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-slate-100 dark:stroke-white/10"
            />
            {/* segments */}
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={STROKE}
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={-a.offset}
                transform={`rotate(-90 ${CX} ${CY})`}
              />
            ))}
            {/* center total */}
            <text
              x={CX}
              y={CY - 2}
              textAnchor="middle"
              className="fill-slate-800 dark:fill-slate-100"
              style={{ fontSize: 22, fontWeight: 800 }}
            >
              {total}
            </text>
            <text
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5 }}
            >
              DAYS
            </text>
          </svg>

          {/* legend */}
          <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2">
            {SEGMENTS.map((seg) => (
              <div key={seg.key} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs text-slate-500">{seg.label}</span>
                <span className="ml-auto text-sm font-bold text-slate-800">
                  {counts[seg.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
