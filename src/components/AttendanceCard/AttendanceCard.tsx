import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Pencil,
  Plane,
  Laptop,
  Timer,
} from 'lucide-react'
import type { AttendanceRecord } from '@/types'
import { Dialog } from '../ui/Dialog'
import { Spinner } from '../ui/Skeleton'
import { combineDateTime, formatDuration, formatTime, toTimeInput } from '@/utils/date'
import { calcTotalMinutes } from '@/utils/attendance'

interface Props {
  record: AttendanceRecord | null
  busy: boolean
  onPunchIn: () => void
  onPunchOut: () => void
  onSetMode: (status: 'Present' | 'WFH') => void
  onMarkLeave: () => void
  /** Save corrected punch-in / punch-out times (ISO strings or null). */
  onUpdateTimes: (punchIn: string | null, punchOut: string | null) => Promise<void>
}

export function AttendanceCard({
  record,
  busy,
  onPunchIn,
  onPunchOut,
  onSetMode,
  onMarkLeave,
  onUpdateTimes,
}: Props) {
  const isLeave = record?.status === 'Leave'
  const punchedIn = Boolean(record?.punch_in)
  const punchedOut = Boolean(record?.punch_out)
  const mode: 'Present' | 'WFH' = record?.status === 'WFH' ? 'WFH' : 'Present'

  // Inline time-edit popup state
  const [editField, setEditField] = useState<'in' | 'out' | null>(null)
  const [timeValue, setTimeValue] = useState('')
  const [savingTime, setSavingTime] = useState(false)
  const [timeErr, setTimeErr] = useState<string | null>(null)

  // Tick every 30s while working so the elapsed time and the "you can leave"
  // hint stay current without needing a refetch.
  const [, setTick] = useState(0)
  const working = punchedIn && !punchedOut
  useEffect(() => {
    if (!working) return
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000)
    return () => window.clearInterval(id)
  }, [working])

  const liveMinutes =
    punchedIn && !punchedOut && record?.punch_in
      ? calcTotalMinutes(record.punch_in, new Date().toISOString())
      : record?.total_minutes ?? null

  // Standard 8-hour workday: when can you leave the office?
  const STANDARD_WORK_MINUTES = 8 * 60
  const leaveInfo = (() => {
    if (!working || !record?.punch_in) return null
    const leaveMs =
      new Date(record.punch_in).getTime() + STANDARD_WORK_MINUTES * 60_000
    const remainingMin = Math.max(0, Math.round((leaveMs - Date.now()) / 60_000))
    return {
      leaveIso: new Date(leaveMs).toISOString(),
      remainingMin,
      done: Date.now() >= leaveMs,
    }
  })()

  const openEdit = (field: 'in' | 'out') => {
    if (!record) return
    setTimeErr(null)
    setTimeValue(
      toTimeInput(field === 'in' ? record.punch_in : record.punch_out)
    )
    setEditField(field)
  }

  const saveTime = async () => {
    if (!record || !editField) return
    setTimeErr(null)
    const newIso = combineDateTime(record.attendance_date, timeValue)
    if (!newIso) {
      setTimeErr('Please enter a time.')
      return
    }
    let punchIn = record.punch_in
    let punchOut = record.punch_out
    if (editField === 'in') punchIn = newIso
    else punchOut = newIso

    if (punchIn && punchOut && new Date(punchOut) < new Date(punchIn)) {
      setTimeErr('Punch out cannot be before punch in.')
      return
    }
    setSavingTime(true)
    try {
      await onUpdateTimes(punchIn, punchOut)
      setEditField(null)
    } catch (e) {
      setTimeErr((e as Error).message)
    } finally {
      setSavingTime(false)
    }
  }

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Today's Attendance</h2>
          <p className="text-sm text-slate-500">
            {isLeave
              ? 'On leave today'
              : punchedOut
                ? 'Day complete'
                : punchedIn
                  ? 'Currently working'
                  : 'Not marked yet'}
          </p>
        </div>
        {record && !isLeave && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
              mode === 'WFH' ? 'bg-brand-500' : 'bg-green-500'
            }`}
          >
            {record.status}
          </span>
        )}
        {isLeave && (
          <span className="rounded-full bg-[#800000] px-3 py-1 text-xs font-bold text-white">
            Leave{record?.leave_type ? ` · ${record.leave_type}` : ''}
          </span>
        )}
      </div>

      {isLeave ? (
        <div className="rounded-2xl bg-[#800000]/5 px-4 py-6 text-center">
          <Plane className="mx-auto mb-2 h-8 w-8 text-[#800000]" />
          <p className="text-sm font-semibold text-slate-700">
            You&apos;re on {record?.leave_type ?? ''} leave today.
          </p>
          {record?.notes && (
            <p className="mt-1 text-sm text-slate-500">{record.notes}</p>
          )}
        </div>
      ) : (
        <>
          {!punchedIn && (
            <div className="mb-4">
              <p className="label">Today&apos;s Status</p>
              <div className="grid grid-cols-2 gap-2">
                <ModeButton
                  active={mode === 'Present'}
                  onClick={() => onSetMode('Present')}
                  disabled={busy}
                  icon={Building2}
                  label="Office"
                />
                <ModeButton
                  active={mode === 'WFH'}
                  onClick={() => onSetMode('WFH')}
                  disabled={busy}
                  icon={Laptop}
                  label="WFH"
                />
              </div>
            </div>
          )}

          {/* Punch times — tap to edit */}
          {punchedIn && (
            <div className="mb-4 grid grid-cols-2 gap-3">
              <TimeBlock
                label="Punch In"
                value={formatTime(record?.punch_in ?? null)}
                onClick={() => openEdit('in')}
                editable
              />
              <TimeBlock
                label="Punch Out"
                value={punchedOut ? formatTime(record?.punch_out ?? null) : '--:--'}
                onClick={() => openEdit('out')}
                editable
                hint={punchedOut ? undefined : 'Tap to set'}
              />
            </div>
          )}

          {punchedIn && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-brand-50/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-semibold text-slate-600">
                  {punchedOut ? 'Total Working Time' : 'Elapsed'}
                </span>
              </div>
              <span className="text-lg font-bold text-brand-700">
                {formatDuration(liveMinutes)}
              </span>
            </div>
          )}

          {/* 8-hour completion hint */}
          {leaveInfo && (
            leaveInfo.done ? (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <p className="text-sm font-semibold text-green-700">
                  8 hours complete — you can leave the office now.
                </p>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3">
                <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm font-medium text-slate-600">
                  You can leave after{' '}
                  <span className="font-bold text-amber-700">
                    {formatTime(leaveInfo.leaveIso)}
                  </span>{' '}
                  <span className="text-slate-400">
                    ({formatDuration(leaveInfo.remainingMin)} to go)
                  </span>
                </p>
              </div>
            )
          )}

          {!punchedIn && (
            <button
              className="btn-primary w-full py-3.5 text-base"
              onClick={onPunchIn}
              disabled={busy}
            >
              {busy ? <Spinner className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              Punch In
            </button>
          )}
          {punchedIn && !punchedOut && (
            <button
              className="btn-dark w-full py-3.5 text-base"
              onClick={onPunchOut}
              disabled={busy}
            >
              {busy ? <Spinner className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
              Punch Out
            </button>
          )}
          {punchedOut && (
            <div className="rounded-2xl bg-green-50 py-3 text-center text-sm font-semibold text-green-600">
              ✓ You&apos;re all done for today
            </div>
          )}
        </>
      )}

      {!punchedIn && !isLeave && (
        <button
          onClick={onMarkLeave}
          disabled={busy}
          className="btn-ghost mt-2 w-full text-slate-500"
        >
          <Plane className="h-4 w-4" />
          Mark today as Leave
        </button>
      )}

      {/* Time edit popup */}
      <Dialog
        open={editField !== null}
        onClose={() => setEditField(null)}
        title={editField === 'in' ? 'Edit Punch In' : 'Edit Punch Out'}
        footer={
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1"
              onClick={() => setEditField(null)}
              disabled={savingTime}
            >
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={saveTime} disabled={savingTime}>
              {savingTime && <Spinner className="h-4 w-4" />}
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          <div>
            <label className="label" htmlFor="time-edit">
              {editField === 'in' ? 'Punch in time' : 'Punch out time'}
            </label>
            <input
              id="time-edit"
              type="time"
              className="input text-lg"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              autoFocus
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Type the time or use the clock. Working hours recalculate automatically.
            </p>
          </div>
          {timeErr && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {timeErr}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  disabled,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  icon: typeof Building2
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function TimeBlock({
  label,
  value,
  onClick,
  editable,
  hint,
}: {
  label: string
  value: string
  onClick?: () => void
  editable?: boolean
  hint?: string
}) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        {editable && <Pencil className="h-3.5 w-3.5 text-slate-300 group-hover:text-brand-500" />}
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      {hint && <p className="text-[11px] font-medium text-brand-500">{hint}</p>}
    </>
  )

  if (editable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group rounded-2xl bg-slate-50/80 px-4 py-3 text-left transition hover:bg-brand-50/70 hover:ring-2 hover:ring-brand-200"
      >
        {content}
      </button>
    )
  }
  return <div className="rounded-2xl bg-slate-50/80 px-4 py-3">{content}</div>
}
