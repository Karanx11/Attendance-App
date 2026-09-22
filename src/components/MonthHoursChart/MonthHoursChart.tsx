import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import type { DayInfo } from '@/types'
import { formatDuration, formatFullDate } from '@/utils/date'

interface Props {
  /** Full month of days (as produced for the calendar). */
  dayInfos: DayInfo[]
}

const WORK_STATUSES = new Set(['Present', 'WFH'])
const GOAL_HOURS = 8

// SVG user-space geometry (scaled to fit the container width).
const W = 300
const LEFT = 16
const RIGHT = 8
const TOP = 10
const CHART_H = 96
const BOTTOM = 20
const BASE_Y = TOP + CHART_H

interface Pt {
  x: number
  y: number
  date: string
  minutes: number
}

/** Catmull-Rom → cubic bezier for a smooth line through the points. */
function smoothLine(pts: Pt[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/** Compact filled-line chart of hours worked per day for one month. */
export function MonthHoursChart({ dayInfos }: Props) {
  const { pts, avgMinutes, yMaxHours, labelIdx } = useMemo(() => {
    const worked = dayInfos.filter(
      (d) =>
        d.record &&
        WORK_STATUSES.has(d.record.status) &&
        d.record.total_minutes != null &&
        d.record.total_minutes > 0
    )
    const maxMin = worked.reduce((m, d) => Math.max(m, d.record!.total_minutes!), 0)
    const yMax = Math.max(GOAL_HOURS + 2, Math.ceil(maxMin / 60))
    const plotW = W - LEFT - RIGHT
    const n = worked.length
    const pts: Pt[] = worked.map((d, i) => {
      const minutes = d.record!.total_minutes!
      return {
        x: LEFT + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2),
        y: BASE_Y - (minutes / 60 / yMax) * CHART_H,
        date: d.date,
        minutes,
      }
    })
    const avg =
      n > 0 ? Math.round(worked.reduce((s, d) => s + d.record!.total_minutes!, 0) / n) : null
    // Show ~5 x-axis day labels without crowding.
    const step = Math.max(1, Math.ceil(n / 5))
    const labelIdx = new Set(pts.map((_, i) => i).filter((i) => i % step === 0 || i === n - 1))
    return { pts, avgMinutes: avg, yMaxHours: yMax, labelIdx }
  }, [dayInfos])

  const yFor = (hours: number) => BASE_Y - (hours / yMaxHours) * CHART_H
  const goalY = yFor(GOAL_HOURS)
  const linePath = smoothLine(pts)
  const areaPath =
    pts.length >= 2
      ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${BASE_Y} L ${pts[0].x.toFixed(1)} ${BASE_Y} Z`
      : ''

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-bold text-slate-800">Working hours</h2>
        </div>
        {avgMinutes != null && (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            Avg {formatDuration(avgMinutes)}
          </span>
        )}
      </div>

      {pts.length === 0 ? (
        <div className="flex h-[130px] flex-col items-center justify-center text-center text-sm text-slate-400">
          <TrendingUp className="mb-1.5 h-6 w-6 opacity-40" />
          No hours logged this month yet.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${TOP + CHART_H + BOTTOM}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Working hours per day. Average ${formatDuration(avgMinutes)}, goal ${GOAL_HOURS} hours.`}
        >
          {/* y gridlines + labels at 4h and 8h(goal) */}
          {[4].map((h) => (
            <g key={h}>
              <line
                x1={LEFT}
                x2={W - RIGHT}
                y1={yFor(h)}
                y2={yFor(h)}
                className="stroke-slate-200 dark:stroke-white/10"
                strokeWidth={1}
              />
              <text
                x={LEFT - 4}
                y={yFor(h) + 3}
                textAnchor="end"
                className="fill-slate-400 dark:fill-slate-500 text-[8px]"
              >
                {h}h
              </text>
            </g>
          ))}

          {/* baseline */}
          <line
            x1={LEFT}
            x2={W - RIGHT}
            y1={BASE_Y}
            y2={BASE_Y}
            className="stroke-slate-200 dark:stroke-white/10"
            strokeWidth={1}
          />

          {/* 8h goal line */}
          <line
            x1={LEFT}
            x2={W - RIGHT}
            y1={goalY}
            y2={goalY}
            stroke="#a06f3f"
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={W - RIGHT}
            y={goalY - 3}
            textAnchor="end"
            className="text-[8px] font-semibold"
            fill="#a06f3f"
          >
            {GOAL_HOURS}h goal
          </text>

          {/* area + line */}
          {areaPath && <path d={areaPath} fill="#a06f3f" fillOpacity={0.12} />}
          <path
            d={linePath}
            fill="none"
            stroke="#a06f3f"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* points (hover for exact value) */}
          {pts.map((p) => (
            <circle key={p.date} cx={p.x} cy={p.y} r={2.4} fill="#a06f3f">
              <title>
                {formatFullDate(p.date)} · {formatDuration(p.minutes)}
              </title>
            </circle>
          ))}

          {/* x-axis day labels */}
          {pts.map((p, i) =>
            labelIdx.has(i) ? (
              <text
                key={`lbl-${p.date}`}
                x={p.x}
                y={BASE_Y + 12}
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500 text-[8px]"
              >
                {Number(p.date.slice(8, 10))}
              </text>
            ) : null
          )}
        </svg>
      )}
    </div>
  )
}
