import { useMemo, useState } from 'react'
import type { AttendanceEditInput, DayInfo, LeaveType } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useRangeData } from '@/hooks/useRangeData'
import { useToast } from '@/components/Toast/ToastProvider'
import { AttendanceCalendar } from '@/components/AttendanceCalendar/AttendanceCalendar'
import { YearHeatmap } from '@/components/YearHeatmap/YearHeatmap'
import { DateDetails } from '@/components/DateDetails/DateDetails'
import { LeaveModal } from '@/components/LeaveModal/LeaveModal'
import { StatCard } from '@/components/StatCard/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  deleteAttendance,
  friendlyError,
  markLeave,
  saveAttendanceEdit,
} from '@/services/attendance'
import { monthRange } from '@/utils/date'

export function CalendarPage() {
  const { user } = useAuth()
  const toast = useToast()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { start, end } = useMemo(() => monthRange(year, month), [year, month])
  const { recordsByDate, dayInfos, stats, loading, refetch } = useRangeData(start, end)

  // Whole-year data for the heatmap below the calendar.
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const yearData = useRangeData(yearStart, yearEnd)

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
    if (!user || !leaveDate) return
    try {
      await markLeave(user.id, leaveDate, type, notes || null)
      await Promise.all([refetch(), yearData.refetch()])
      toast.success('Leave saved.')
      setLeaveOpen(false)
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  const handleSaveEdit = async (date: string, edit: AttendanceEditInput) => {
    if (!user) return
    await saveAttendanceEdit(user.id, date, edit)
    await Promise.all([refetch(), yearData.refetch()])
    toast.success('Attendance updated.')
    setSelected(null)
  }

  const handleClear = async (day: DayInfo) => {
    if (!day.record || !user) return
    setBusy(true)
    try {
      await deleteAttendance(user.id, day.record.id)
      await Promise.all([refetch(), yearData.refetch()])
      toast.success('Record cleared.')
      setSelected(null)
    } catch (e) {
      toast.error(friendlyError(e))
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
