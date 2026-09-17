import { useMemo, useState } from 'react'
import type { AttendanceEditInput, DayInfo, LeaveType } from '@/types'
import { useRangeData } from '@/hooks/useRangeData'
import { useAttendanceWrite } from '@/hooks/useAttendanceWrite'
import { AttendanceCalendar } from '@/components/AttendanceCalendar/AttendanceCalendar'
import { YearHeatmap } from '@/components/YearHeatmap/YearHeatmap'
import { DateDetails } from '@/components/DateDetails/DateDetails'
import { LeaveModal } from '@/components/LeaveModal/LeaveModal'
import { StatCard } from '@/components/StatCard/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { monthRange } from '@/utils/date'

export function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { start, end } = useMemo(() => monthRange(year, month), [year, month])
  const monthData = useRangeData(start, end)
  const { recordsByDate, dayInfos, stats, loading } = monthData

  // Whole-year data for the heatmap below the calendar.
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const yearData = useRangeData(yearStart, yearEnd)

  // Offline-aware writes fan out to both the month and year views.
  const { saveDay, clearDay } = useAttendanceWrite({
    upsertLocal: (r) => {
      monthData.upsertLocal(r)
      yearData.upsertLocal(r)
    },
    removeLocal: (d) => {
      monthData.removeLocal(d)
      yearData.removeLocal(d)
    },
    refetch: async () => {
      await Promise.all([monthData.refetch(), yearData.refetch()])
    },
  })

  const [selected, setSelected] = useState<DayInfo | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveDate, setLeaveDate] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else setMonth((m) => m + 1)
  }

  const openLeave = (date: string) => {
    setLeaveDate(date)
    setLeaveOpen(true)
    setSelected(null)
  }

  const handleSaveLeave = async (type: LeaveType, notes: string) => {
    if (!leaveDate) return
    await saveDay(
      leaveDate,
      {
        status: 'Leave',
        punchIn: null,
        punchOut: null,
        leaveType: type,
        notes: notes || null,
      },
      recordsByDate.get(leaveDate) ?? null,
      'Leave saved.'
    )
    setLeaveOpen(false)
  }

  const handleSaveEdit = async (date: string, edit: AttendanceEditInput) => {
    await saveDay(date, edit, recordsByDate.get(date) ?? null, 'Attendance updated.')
    setSelected(null)
  }

  const handleClear = async (day: DayInfo) => {
    if (!day.record) return
    setBusy(true)
    try {
      await clearDay(day.date, day.record, 'Record cleared.')
      setSelected(null)
    } finally {
      setBusy(false)
    }
  }

  const leaveRecord = leaveDate ? recordsByDate.get(leaveDate) ?? null : null

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Calendar
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Tap any day to view or edit its attendance.
        </p>
      </header>

      {/* Mobile: stats on top, calendar below. Desktop: calendar left, stats side. */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Stats */}
        <div className="lg:order-2 lg:col-span-1">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <StatCard label="Present" value={loading ? '—' : stats.present} accent="text-green-600" iconBg="bg-green-50" />
            <StatCard label="WFH" value={loading ? '—' : stats.wfh} accent="text-brand-600" iconBg="bg-brand-50" />
            <StatCard label="Leave" value={loading ? '—' : stats.leave} accent="text-[#800000]" iconBg="bg-[#800000]/10" />
            <StatCard label="Absent" value={loading ? '—' : stats.absent} accent="text-amber-600" iconBg="bg-amber-50" />
          </div>
        </div>

        {/* Calendar */}
        <div className="lg:order-1 lg:col-span-2">
          <div className="glass-card p-4 sm:p-6">
            {loading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <AttendanceCalendar
                year={year}
                month={month}
                dayInfos={dayInfos}
                onSelectDate={(date) =>
                  setSelected(dayInfos.find((d) => d.date === date) ?? null)
                }
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
              />
            )}
          </div>
        </div>
      </div>

      {/* Year-at-a-glance heatmap */}
      <div className="glass-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">{year} overview</h3>
        </div>
        {yearData.loading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <YearHeatmap
            year={year}
            dayInfos={yearData.dayInfos}
            onSelectDate={(date) =>
              setSelected(yearData.dayInfos.find((d) => d.date === date) ?? null)
            }
          />
        )}
      </div>

      <DateDetails
        open={Boolean(selected)}
        day={selected}
        onClose={() => setSelected(null)}
        onMarkLeave={openLeave}
        onClear={handleClear}
        onSave={handleSaveEdit}
        busy={busy}
      />

      <LeaveModal
        open={leaveOpen}
        date={leaveDate}
        initialType={leaveRecord?.leave_type ?? null}
        initialNotes={leaveRecord?.notes ?? null}
        onClose={() => setLeaveOpen(false)}
        onSave={handleSaveLeave}
      />
    </div>
  )
}
