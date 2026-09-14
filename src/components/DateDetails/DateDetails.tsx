import { useEffect, useState } from 'react'
import { Building2, CalendarOff, Laptop, Pencil, Plane, Star, Trash2 } from 'lucide-react'
import { isJoiningDate } from '@/utils/config'
import type { AttendanceEditInput, DayInfo, LeaveType } from '@/types'
import { Dialog } from '../ui/Dialog'
import { Spinner } from '../ui/Skeleton'
import {
  combineDateTime,
  formatDuration,
  formatFullDate,
  formatTime,
  isFutureKey,
  toTimeInput,
} from '@/utils/date'
import { KIND_STYLES } from '@/utils/status'

interface Props {
  open: boolean
  day: DayInfo | null
  onClose: () => void
  onMarkLeave?: (date: string) => void
  onClear?: (day: DayInfo) => void
  /** Save edited status / punch times for this day. */
  onSave?: (date: string, edit: AttendanceEditInput) => Promise<void>
  busy?: boolean
}

const LEAVE_TYPES: LeaveType[] = ['Casual', 'Sick', 'Personal', 'Other']

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  )
}

export function DateDetails({
  open,
  day,
  onClose,
  onMarkLeave,
  onClear,
  onSave,
  busy,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<'Present' | 'WFH' | 'Leave'>('Present')
  const [inTime, setInTime] = useState('')
  const [outTime, setOutTime] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Reset edit state whenever the dialog opens on a new day.
  useEffect(() => {
    if (open && day) {
      setEditing(false)
      setErr(null)
      const r = day.record
      setStatus(r?.status ?? 'Present')
      setInTime(toTimeInput(r?.punch_in ?? null))
      setOutTime(toTimeInput(r?.punch_out ?? null))
      setLeaveType((r?.leave_type as LeaveType) ?? 'Casual')
      setNotes(r?.notes ?? '')
    }
  }, [open, day])

  if (!day) return null
  const { record, holiday, date } = day
  const future = isFutureKey(date)

  const statusStyle =
    record?.status === 'Present'
      ? KIND_STYLES.present
      : record?.status === 'WFH'
        ? KIND_STYLES.wfh
        : record?.status === 'Leave'
          ? KIND_STYLES.leave
          : null

  const handleSave = async () => {
    if (!onSave) return
    setErr(null)
    const edit: AttendanceEditInput =
      status === 'Leave'
        ? {
            status: 'Leave',
            punchIn: null,
            punchOut: null,
            leaveType,
            notes: notes.trim() || null,
          }
        : {
            status,
            punchIn: combineDateTime(date, inTime),
            punchOut: combineDateTime(date, outTime),
            leaveType: null,
            notes: notes.trim() || null,
          }

    if (edit.punchIn && edit.punchOut && new Date(edit.punchOut) < new Date(edit.punchIn)) {
      setErr('Punch out cannot be before punch in.')
      return
    }
    if (!edit.punchIn && edit.punchOut) {
      setErr('Add a punch-in time first.')
      return
    }

    setSaving(true)
    try {
      await onSave(date, edit)
      setEditing(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={formatFullDate(date)}
      footer={
        editing ? (
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />}
              Save
            </button>
          </div>
        ) : undefined
      }
    >
      {/* ── View mode ─────────────────────────────────────────── */}
      {!editing && (
        <div className="pb-3">
          {isJoiningDate(date) && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400">
                <Star className="h-4 w-4 fill-white text-white" />
              </span>
              <div>
                <p className="text-sm font-bold text-amber-700">Joining Date</p>
                <p className="text-xs text-amber-600">Your first day 🎉</p>
              </div>
            </div>
          )}
          {record && statusStyle && (
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold text-white"
              style={{ backgroundColor: statusStyle.color }}
            >
              {record.status}
              {record.status === 'Leave' && record.leave_type
                ? ` · ${record.leave_type}`
                : ''}
            </div>
          )}

          {record && record.status !== 'Leave' && (
            <div className="rounded-2xl bg-slate-50/80 px-4">
              <Row label="Status" value={record.status} />
              <Row label="Punch In" value={formatTime(record.punch_in)} />
              <Row label="Punch Out" value={formatTime(record.punch_out)} />
              <Row
                label="Working Hours"
                value={
                  record.total_minutes != null
                    ? formatDuration(record.total_minutes)
                    : record.punch_in && !record.punch_out
                      ? 'In progress'
                      : '--'
                }
              />
            </div>
          )}

          {record && record.status === 'Leave' && (
            <div className="rounded-2xl bg-slate-50/80 px-4">
              <Row label="Status" value="Leave" />
              <Row label="Type" value={record.leave_type ?? '--'} />
              {record.notes && <Row label="Notes" value={record.notes} />}
            </div>
          )}

          {!record && holiday && (
            <div className="rounded-2xl bg-red-50 px-4 py-4 text-center">
              <p className="text-base font-bold text-red-600">{holiday.holiday_name}</p>
              <p className="text-sm text-red-400">Holiday</p>
            </div>
          )}

          {!record && !holiday && day.isWeekend && (
            <div className="rounded-2xl bg-red-50 px-4 py-4 text-center">
              <p className="text-sm font-semibold text-red-500">Weekend</p>
            </div>
          )}

          {!record && !holiday && !day.isWeekend && (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-slate-50/80 px-4 py-6 text-center">
              <CalendarOff className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No attendance recorded</p>
              {!future && day.kind === 'absent' && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                  Marked Absent
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {!future && (
            <div className="mt-4 flex gap-2">
              {onSave && (
                <button
                  className="btn-primary flex-1"
                  onClick={() => setEditing(true)}
                  disabled={busy}
                >
                  <Pencil className="h-4 w-4" />
                  {record ? 'Edit' : 'Add Attendance'}
                </button>
              )}
              {onMarkLeave && (
                <button
                  className="btn-secondary"
                  onClick={() => onMarkLeave(date)}
                  disabled={busy}
                >
                  <Plane className="h-4 w-4" />
                  Leave
                </button>
              )}
              {onClear && record && (
                <button
                  className="btn text-red-600 hover:bg-red-50"
                  onClick={() => onClear(day)}
                  disabled={busy}
                  aria-label="Clear record"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {future && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Future dates can&apos;t be marked.
            </p>
          )}
        </div>
      )}

      {/* ── Edit mode ─────────────────────────────────────────── */}
      {editing && (
        <div className="space-y-4 pb-2">
          <div>
            <p className="label">Status</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['Present', 'Office', Building2],
                  ['WFH', 'WFH', Laptop],
                  ['Leave', 'Leave', Plane],
                ] as const
              ).map(([val, lbl, Icon]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStatus(val)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                    status === val
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {status !== 'Leave' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="edit-in">Punch In</label>
                <input
                  id="edit-in"
                  type="time"
                  className="input"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-out">Punch Out</label>
                <input
                  id="edit-out"
                  type="time"
                  className="input"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="label">Leave Type</p>
              <div className="grid grid-cols-2 gap-2">
                {LEAVE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLeaveType(t)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      leaveType === t
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="edit-notes">Notes</label>
            <textarea
              id="edit-notes"
              className="input min-h-[64px] resize-none"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {status !== 'Leave' && (
            <p className="text-xs text-slate-400">
              Leave a time empty to clear it. Working hours are calculated automatically.
            </p>
          )}

          {err && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {err}
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}
