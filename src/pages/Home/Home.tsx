import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Clock,
  LogIn as LogInIcon,
  LogOut as LogOutIcon,
  Percent,
  Plane,
  TrendingUp,
} from 'lucide-react'
import type { AttendanceEditInput, DayInfo, LeaveType } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { useRangeData } from '@/hooks/useRangeData'
import { useAttendanceWrite } from '@/hooks/useAttendanceWrite'
import { AttendanceCard } from '@/components/AttendanceCard/AttendanceCard'
import { ImportBanner } from '@/components/ImportBanner/ImportBanner'
import { PunchReminder } from '@/components/PunchReminder/PunchReminder'
import { LatePunchDialog } from '@/components/LatePunchDialog/LatePunchDialog'
import { AttendanceCalendar } from '@/components/AttendanceCalendar/AttendanceCalendar'
import { DateDetails } from '@/components/DateDetails/DateDetails'
import { LeaveModal } from '@/components/LeaveModal/LeaveModal'
import { StatCard } from '@/components/StatCard/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  formatDuration,
  formatLongDate,
  formatTimeFromMinutes,
  greeting,
  monthRange,
  todayKey,
} from '@/utils/date'

export function Home() {
  const { user } = useAuth()
  const { profile, workingDays } = useProfile()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const { start, end } = useMemo(() => monthRange(year, month), [year, month])

  // Current month drives today's card + monthly stats.
  const cur = useRangeData(start, end)
  const { recordsByDate, dayInfos, stats, loading } = cur

  // The mini calendar can browse months on its own.
  const [calYear, setCalYear] = useState(year)
  const [calMonth, setCalMonth] = useState(month)
  const { start: calStart, end: calEnd } = useMemo(
    () => monthRange(calYear, calMonth),
    [calYear, calMonth]
  )
  const cal = useRangeData(calStart, calEnd)

  // Offline-aware writes fan out to whichever month view holds the date.
  const { saveDay, clearDay } = useAttendanceWrite({
    upsertLocal: (r) => {
      cur.upsertLocal(r)
      cal.upsertLocal(r)
    },
    removeLocal: (d) => {
      cur.removeLocal(d)
      cal.removeLocal(d)
    },
    refetch: async () => {
      await Promise.all([cur.refetch(), cal.refetch()])
    },
  })

  const refreshAll = () => void Promise.all([cur.refetch(), cal.refetch()])
  const recordFor = (date: string) =>
    cal.recordsByDate.get(date) ?? recordsByDate.get(date) ?? null

  const prevCalMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1)
      setCalMonth(11)
    } else setCalMonth((m) => m - 1)
  }
  const nextCalMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1)
      setCalMonth(0)
    } else setCalMonth((m) => m + 1)
  }

  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<DayInfo | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveDate, setLeaveDate] = useState<string | null>(null)

  const today = todayKey()
  const todayRecord = recordsByDate.get(today) ?? null
  const name = profile?.name || user?.email?.split('@')[0] || 'there'

  // Reminder eligibility: working day, not a holiday, not on leave, not punched in.
  const todayInfo = dayInfos.find((d) => d.date === today)
  const isHolidayToday = Boolean(todayInfo?.holiday)
  const isWorkingToday = workingDays.includes(now.getDay()) && !isHolidayToday
  const reminderEligible =
    !loading &&
    isWorkingToday &&
    todayRecord?.status !== 'Leave' &&
    !todayRecord?.punch_in

  // ── Mutations (offline-aware via useAttendanceWrite) ──────────────────────
  const nowIso = () => new Date().toISOString()

  const withBusy = async (fn: () => Promise<void>) => {
    if (busy || !user) return
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const handlePunchIn = () =>
    void withBusy(() =>
      saveDay(
        today,
        {
          status: todayRecord?.status === 'WFH' ? 'WFH' : 'Present',
          punchIn: nowIso(),
          punchOut: null,
          leaveType: null,
          notes: todayRecord?.notes ?? null,
        },
        todayRecord,
        'Punched in. Have a great day!'
      )
    )

  const handlePunchOut = () =>
    void withBusy(() => {
      if (!todayRecord?.punch_in) return Promise.resolve()
      return saveDay(
        today,
        {
          status: todayRecord.status === 'WFH' ? 'WFH' : 'Present',
          punchIn: todayRecord.punch_in,
          punchOut: nowIso(),
          leaveType: null,
          notes: todayRecord.notes,
        },
        todayRecord,
        'Punched out. See you!'
      )
    })

  const handleSetMode = (status: 'Present' | 'WFH') =>
    void withBusy(() =>
      saveDay(
        today,
        {
          status,
          punchIn: todayRecord?.punch_in ?? null,
          punchOut: todayRecord?.punch_out ?? null,
          leaveType: null,
          notes: todayRecord?.notes ?? null,
        },
        todayRecord,
        `Set to ${status === 'WFH' ? 'WFH' : 'Office'}`
      )
    )

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
      recordFor(leaveDate),
      'Leave saved.'
    )
    setLeaveOpen(false)
  }

  const handleUpdateTimes = async (
    punchInIso: string | null,
    punchOutIso: string | null
  ) => {
    if (!todayRecord) return
    await saveDay(
      today,
      {
        status: todayRecord.status === 'WFH' ? 'WFH' : 'Present',
        punchIn: punchInIso,
        punchOut: punchOutIso,
        leaveType: null,
        notes: todayRecord.notes,
      },
      todayRecord,
      'Time updated.'
    )
  }

  const handleSaveEdit = async (date: string, edit: AttendanceEditInput) => {
    await saveDay(date, edit, recordFor(date), 'Attendance updated.')
    setSelected(null)
  }

  const handleClear = (day: DayInfo) => {
    if (!day.record) return
    void withBusy(() => clearDay(day.date, day.record!, 'Record cleared.'))
    setSelected(null)
  }

  const leaveRecord = leaveDate ? recordFor(leaveDate) : null

  return (
    <div className="space-y-5">
      <ImportBanner onImported={refreshAll} />

      <PunchReminder
        eligible={reminderEligible}
        busy={busy}
        onPunchIn={handlePunchIn}
      />

      <LatePunchDialog
        eligible={reminderEligible}
        busy={busy}
        onPunchIn={handlePunchIn}
      />

      {/* Header */}
      <header className="animate-fade-in">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          {greeting()}, {name} 👋
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4" />
          {formatLongDate(now)}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: attendance + stats */}
        <div className="space-y-5 lg:col-span-3">
          {loading && !todayRecord ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <AttendanceCard
              record={todayRecord}
              busy={busy}
              onPunchIn={handlePunchIn}
              onPunchOut={handlePunchOut}
              onSetMode={handleSetMode}
              onMarkLeave={() => openLeave(today)}
              onUpdateTimes={handleUpdateTimes}
            />
          )}

          {/* Monthly stat grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Present"
              value={loading ? '—' : stats.present}
              icon={LogInIcon}
              accent="text-green-600"
              iconBg="bg-green-50"
            />
            <StatCard
              label="WFH"
              value={loading ? '—' : stats.wfh}
              icon={LogOutIcon}
              accent="text-brand-600"
              iconBg="bg-brand-50"
            />
            <StatCard
              label="Leave"
              value={loading ? '—' : stats.leave}
              icon={Plane}
              accent="text-[#800000]"
              iconBg="bg-[#800000]/10"
            />
            <StatCard
              label="Absent"
              value={loading ? '—' : stats.absent}
              icon={CalendarDays}
              accent="text-amber-600"
              iconBg="bg-amber-50"
            />
          </div>

          {/* Averages */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Attendance"
              value={loading ? '—' : `${stats.attendancePercent}%`}
              icon={Percent}
            />
            <StatCard
              label="Avg In"
              value={loading ? '—' : formatTimeFromMinutes(stats.avgPunchInMinutes)}
              icon={Clock}
            />
            <StatCard
              label="Avg Out"
              value={loading ? '—' : formatTimeFromMinutes(stats.avgPunchOutMinutes)}
              icon={Clock}
            />
            <StatCard
              label="Avg Hours"
              value={loading ? '—' : formatDuration(stats.avgWorkingMinutes)}
              icon={TrendingUp}
            />
          </div>
        </div>

        {/* Right: compact calendar (browsable) */}
        <div className="lg:col-span-2">
          <div className="glass-card p-4 sm:p-5">
            {cal.loading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <AttendanceCalendar
                year={calYear}
                month={calMonth}
                dayInfos={cal.dayInfos}
                onSelectDate={(date) =>
                  setSelected(cal.dayInfos.find((d) => d.date === date) ?? null)
                }
                onPrevMonth={prevCalMonth}
                onNextMonth={nextCalMonth}
              />
            )}
          </div>
        </div>
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
