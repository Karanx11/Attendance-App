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
import { useToast } from '@/components/Toast/ToastProvider'
import { AttendanceCard } from '@/components/AttendanceCard/AttendanceCard'
import { ImportBanner } from '@/components/ImportBanner/ImportBanner'
import { PunchReminder } from '@/components/PunchReminder/PunchReminder'
import { AttendanceCalendar } from '@/components/AttendanceCalendar/AttendanceCalendar'
import { DateDetails } from '@/components/DateDetails/DateDetails'
import { LeaveModal } from '@/components/LeaveModal/LeaveModal'
import { StatCard } from '@/components/StatCard/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  deleteAttendance,
  friendlyError,
  markLeave,
  punchIn,
  punchOut,
  saveAttendanceEdit,
  setTodayMode,
} from '@/services/attendance'
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
  const toast = useToast()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const { start, end } = useMemo(() => monthRange(year, month), [year, month])

  const { recordsByDate, dayInfos, stats, loading, refetch } = useRangeData(start, end)

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

  // ── Mutations ────────────────────────────────────────────────────────────
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    if (busy || !user) return
    setBusy(true)
    try {
      await fn()
      await refetch()
      toast.success(ok)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const handlePunchIn = () =>
    run(
      () => punchIn(user!.id, todayRecord?.status === 'WFH' ? 'WFH' : 'Present'),
      'Punched in. Have a great day!'
    )

  const handlePunchOut = () => run(() => punchOut(user!.id), 'Punched out. See you!')

  const handleSetMode = (status: 'Present' | 'WFH') =>
    run(() => setTodayMode(user!.id, status), `Set to ${status === 'WFH' ? 'WFH' : 'Office'}`)

  const openLeave = (date: string) => {
    setLeaveDate(date)
    setLeaveOpen(true)
    setSelected(null)
  }

  const handleSaveLeave = async (type: LeaveType, notes: string) => {
    if (!user || !leaveDate) return
    try {
      await markLeave(user.id, leaveDate, type, notes || null)
      await refetch()
      toast.success('Leave saved.')
      setLeaveOpen(false)
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }

  const handleUpdateTimes = async (
    punchInIso: string | null,
    punchOutIso: string | null
  ) => {
    if (!user || !todayRecord) return
    await saveAttendanceEdit(user.id, today, {
      status: todayRecord.status === 'WFH' ? 'WFH' : 'Present',
      punchIn: punchInIso,
      punchOut: punchOutIso,
      leaveType: null,
      notes: todayRecord.notes,
    })
    await refetch()
    toast.success('Time updated.')
  }

  const handleSaveEdit = async (date: string, edit: AttendanceEditInput) => {
    if (!user) return
    await saveAttendanceEdit(user.id, date, edit)
    await refetch()
    toast.success('Attendance updated.')
    setSelected(null)
  }

  const handleClear = (day: DayInfo) => {
    if (!day.record) return
    void run(() => deleteAttendance(user!.id, day.record!.id), 'Record cleared.')
    setSelected(null)
  }

  const leaveRecord =
    leaveDate ? recordsByDate.get(leaveDate) ?? null : null

  return (
    <div className="space-y-5">
      <ImportBanner onImported={() => void refetch()} />

      <PunchReminder
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

        {/* Right: compact calendar */}
        <div className="lg:col-span-2">
          <div className="glass-card p-4 sm:p-5">
            {loading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <AttendanceCalendar
                year={year}
                month={month}
                dayInfos={dayInfos}
                onSelectDate={(date) =>
                  setSelected(dayInfos.find((d) => d.date === date) ?? null)
                }
                showNav={false}
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
