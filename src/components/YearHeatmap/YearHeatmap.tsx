import { useMemo } from 'react'
import type { DayInfo, DayKind } from '@/types'
import { formatFullDate, MONTHS_SHORT, toDateKey } from '@/utils/date'

interface Props {
  year: number
  dayInfos: DayInfo[]
  onSelectDate: (date: string) => void
}

interface Cell {
  key: string
  month: number
  day: number
  inYear: boolean
  info: DayInfo | null
}

/** Tailwind background per resolved day kind (theme-aware via dark overrides). */
const CELL_BG: Record<DayKind, string> = {
  present: 'bg-green-500',
  wfh: 'bg-brand-500',
  leave: 'bg-[#800000]',
  absent: 'bg-amber-400',
  weekend: 'bg-red-100',
  holiday: 'bg-red-100',
  future: 'bg-slate-100',
  unmarked: 'bg-slate-100',
  today: 'bg-slate-100',
}

const LEGEND: { label: string; className: string }[] = [
  { label: 'Present', className: 'bg-green-500' },
  { label: 'WFH', className: 'bg-brand-500' },
  { label: 'Leave', className: 'bg-[#800000]' },
  { label: 'Absent', className: 'bg-amber-400' },
  { label: 'Weekend / Holiday', className: 'bg-red-100' },
  { label: 'Upcoming', className: 'bg-slate-100' },
]

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

export function YearHeatmap({ year, dayInfos, onSelectDate }: Props) {
  const byDate = useMemo(() => {
    const m = new Map<string, DayInfo>()
    for (const d of dayInfos) m.set(d.date, d)
    return m
  }, [dayInfos])

  const weeks = useMemo<Cell[][]>(() => {
    const jan1 = new Date(year, 0, 1)
    const dec31 = new Date(year, 11, 31)
    const start = new Date(jan1)
    start.setDate(jan1.getDate() - jan1.getDay()) // back to the Sunday
    const end = new Date(dec31)
    end.setDate(dec31.getDate() + (6 - dec31.getDay())) // forward to the Saturday

    const out: Cell[][] = []
    const cur = new Date(start)
    while (cur <= end) {
      const week: Cell[] = []
      for (let i = 0; i < 7; i++) {
        const inYear = cur.getFullYear() === year
        const key = toDateKey(cur)
        week.push({
          key,
          month: cur.getMonth(),
          day: cur.getDate(),
          inYear,
          info: inYear ? byDate.get(key) ?? null : null,
        })
        cur.setDate(cur.getDate() + 1)
      }
      out.push(week)
    }
    return out
  }, [year, byDate])

  // Month label per column: the week that contains the 1st of a month.
  const monthLabels = useMemo(
    () =>
      weeks.map((week) => {
        const first = week.find((c) => c.inYear && c.day === 1)
        return first ? MONTHS_SHORT[first.month] : ''
      }),
    [weeks]
  )

  return (
    <div>
      <div className="flex gap-1.5">
        {/* Weekday labels (fixed) */}
        <div className="flex shrink-0 flex-col gap-[3px]">
          <div className="h-3" />
          {WEEKDAY_LABELS.map((l, i) => (
            <div key={i} className="h-3 text-[9px] leading-3 text-slate-400">
              {l}
            </div>
          ))}
        </div>

        {/* Scrollable grid */}
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex flex-col gap-[3px]">
            {/* Month labels */}
            <div className="flex gap-[3px]">
              {monthLabels.map((label, w) => (
                <div key={w} className="relative h-3 w-3">
                  {label && (
                    <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] text-slate-400">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Week columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {week.map((cell, d) => {
                    if (!cell.inYear) return <div key={d} className="h-3 w-3" />
                    const kind = cell.info?.kind ?? 'unmarked'
                    return (
                      <button
                        key={d}
                        onClick={() => onSelectDate(cell.key)}
                        title={`${formatFullDate(cell.key)}${
                          cell.info?.holiday ? ` · ${cell.info.holiday.holiday_name}` : ''
                        }`}
                        className={`h-3 w-3 rounded-[3px] transition hover:ring-2 hover:ring-brand-300 ${
                          CELL_BG[kind]
                        } ${cell.info?.isToday ? 'ring-1 ring-brand-500' : ''}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {LEGEND.map(({ label, className }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-[3px] ${className}`} />
            <span className="text-xs font-medium text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
