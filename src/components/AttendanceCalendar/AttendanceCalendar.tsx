import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import type { DayInfo } from '@/types'
import { fromDateKey, monthLabel } from '@/utils/date'
import { KIND_STYLES, LEGEND } from '@/utils/status'
import { isJoiningDate } from '@/utils/config'

interface Props {
  year: number
  month: number // 0-based
  dayInfos: DayInfo[]
  onSelectDate: (date: string) => void
  onPrevMonth?: () => void
  onNextMonth?: () => void
  showLegend?: boolean
  showNav?: boolean
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function AttendanceCalendar({
  year,
  month,
  dayInfos,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  showLegend = true,
  showNav = true,
}: Props) {
  const byDate = useMemo(() => {
    const m = new Map<string, DayInfo>()
    for (const d of dayInfos) m.set(d.date, d)
    return m
  }, [dayInfos])

  // Leading blanks so day 1 lands under the correct weekday.
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (DayInfo | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push(byDate.get(key) ?? null)
  }

  return (
    <div>
      {showNav && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            {monthLabel(year, month)}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevMonth}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={onNextMonth}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={i}
            className={`pb-1 text-center text-[11px] font-bold ${
              i === 0 || i === 6 ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {w}
          </div>
        ))}

        {cells.map((info, i) => {
          if (!info) return <div key={`b-${i}`} />
          const day = fromDateKey(info.date).getDate()
          // "today" cell uses ring style unless it already has a record kind
          const kind = info.isToday && info.kind === 'today' ? 'today' : info.kind
          const style = KIND_STYLES[kind]
          const joining = isJoiningDate(info.date)
          return (
            <button
              key={info.date}
              onClick={() => onSelectDate(info.date)}
              title={joining ? 'Joining Date' : info.holiday?.holiday_name ?? style.label}
              className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition
                          hover:scale-[1.06] hover:shadow-glass-sm sm:text-sm ${style.cell} ${
                            joining ? 'ring-2 ring-amber-400' : ''
                          }`}
            >
              {day}
              {joining && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 shadow-sm">
                  <Star className="h-2.5 w-2.5 fill-white text-white" />
                </span>
              )}
              {!joining && info.holiday && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-70" />
              )}
            </button>
          )
        })}
      </div>

      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {LEGEND.map(({ kind, label }) => (
            <div key={kind} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: KIND_STYLES[kind].color }}
              />
              <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
