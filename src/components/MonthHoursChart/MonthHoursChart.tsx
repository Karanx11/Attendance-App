import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import type { DayInfo } from '@/types'
import { formatDuration, formatFullDate } from '@/utils/date'

interface Props {
  /** Full month of days (as produced for the calendar). */
  dayInfos: DayInfo[]
}

const WORK_STATUSES = new Set(['Present', 'WFH'])
const GOAL_HOURS = 8

// SVG user-space geometry (scaled to fit the container width).
const STEP = 12 // horizontal slot per day
const BAR_W = 7
const TOP = 8
const CHART_H = 104
const BOTTOM = 4
const BASE_Y = TOP + CHART_H

/** Compact bar chart of hours worked per day for a single month. */
export function MonthHoursChart({ dayInfos }: Props) {
  const { bars, avgMinutes, yMaxHours, worked } = useMemo(() => {
    const bars = dayInfos.map((d, i) => {
      const rec = d.record
      const minutes =
        rec && WORK_STATUSES.has(rec.status) && rec.total_minutes != null
          ? rec.total_minutes
          : 0
      return {
        i,
        date: d.date,
        minutes,
        isWfh: rec?.status === 'WFH',
      }
    })
    const workedBars = bars.filter((b) => b.minutes > 0)
    const maxMin = workedBars.reduce((m, b) => Math.max(m, b.minutes), 0)
    const avg =
      workedBars.length > 0
        ? Math.round(
            workedBars.reduce((s, b) => s + b.minutes, 0) / workedBars.length
          )
        : null
    return {
      bars,
      avgMinutes: avg,
      worked: workedBars.length,
      yMaxHours: Math.max(GOAL_HOURS + 1, Math.ceil(maxMin / 60)),
    }
  }, [dayInfos])

  const width = Math.max(bars.length, 1) * STEP
  const height = BASE_Y + BOTTOM
  const yFor = (minutes: number) =>
    BASE_Y - (minutes / 60 / yMaxHours) * CHART_H
  const goalY = yFor(GOAL_HOURS * 60)

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-bold text-slate-800">Working hours</h2>
        </div>
        {avgMinutes != null && (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            Avg {formatDuration(avgMinutes)}
          </span>
        )}
      </div>

      {worked === 0 ? (
        <div className="flex h-[120px] flex-col items-center justify-center text-center text-sm text-slate-400">
          <BarChart3 className="mb-1.5 h-6 w-6 opacity-40" />
          No hours logged this month yet.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Working hours per day. Average ${formatDuration(
            avgMinutes
          )}, goal ${GOAL_HOURS} hours.`}
        >
          {/* 8-hour goal line */}
          <line
            x1={0}
            x2={width}
            y1={goalY}
            y2={goalY}
            className="stroke-brand-400/60"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={width}
            y={goalY - 3}
            textAnchor="end"
            className="fill-brand-500 text-[8px] font-semibold"
          >
            {GOAL_HOURS}h goal
          </text>

          {/* Baseline */}
          <line
            x1={0}
            x2={width}
            y1={BASE_Y}
            y2={BASE_Y}
            className="stroke-slate-200 dark:stroke-white/10"
            strokeWidth={1}
          />

          {/* Bars */}
          {bars.map((b) =>
            b.minutes > 0 ? (
              <g key={b.date}>
                <rect
                  x={b.i * STEP + (STEP - BAR_W) / 2}
                  y={yFor(b.minutes)}
                  width={BAR_W}
                  height={Math.max(2, BASE_Y - yFor(b.minutes))}
                  rx={2}
                  fill={b.isWfh ? '#a06f3f' : '#22c55e'}
                >
                  <title>
                    {formatFullDate(b.date)} · {formatDuration(b.minutes)}
                    {b.isWfh ? ' (WFH)' : ''}
                  </title>
                </rect>
              </g>
            ) : null
          )}
        </svg>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          Office
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
          WFH
        </span>
      </div>
    </div>
  )
}
