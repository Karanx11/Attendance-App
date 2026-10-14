import { useEffect, useState } from 'react'
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react'
import type { AttendanceRecord } from '@/types'
import { Dialog } from '../ui/Dialog'
import { Spinner } from '../ui/Skeleton'
import { combineDateTime, formatFullDate, formatTime, toTimeInput } from '@/utils/date'

interface Props {
  /** The past day with a missing punch-out, or null if none. */
  record: AttendanceRecord | null
  /** Save the chosen punch-out time for the day. */
  onSave: (date: string, punchOutIso: string) => Promise<void>
  /** Remove the day's record entirely (it wasn't a work day). */
  onClear: (record: AttendanceRecord) => Promise<void>
  /** Hide the banner for now (until next load). */
  onDismiss: () => void
}

/** Default suggested punch-out = punch-in + 8 hours. */
function defaultOutTime(punchInIso: string): string {
  const d = new Date(new Date(punchInIso).getTime() + 8 * 60 * 60 * 1000)
  return toTimeInput(d.toISOString())
}

export function PunchOutRecovery({ record, onSave, onClear, onDismiss }: Props) {
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open && record?.punch_in) {
      setErr(null)
      setTime(defaultOutTime(record.punch_in))
    }
  }, [open, record?.punch_in])

  if (!record) return null

  const handleSave = async () => {
    if (!record.punch_in) return
    setErr(null)
    const outIso = combineDateTime(record.attendance_date, time)
    if (!outIso) {
      setErr('Please enter a punch-out time.')
      return
    }
    if (new Date(outIso) <= new Date(record.punch_in)) {
      setErr('Punch out must be after punch in.')
      return
    }
    setSaving(true)
    try {
      await onSave(record.attendance_date, outIso)
      setOpen(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setErr(null)
    setSaving(true)
    try {
      await onClear(record)
      setOpen(false)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 animate-fade-in">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-800">Missing punch-out</p>
          <p className="truncate text-xs text-amber-700">
            You didn&apos;t punch out on {formatFullDate(record.attendance_date)}.
          </p>
        </div>
        <button
          className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
          onClick={() => setOpen(true)}
        >
          Fix it
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-amber-500 transition hover:bg-amber-100 hover:text-amber-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add missing punch-out"
        footer={
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
              Save punch-out
            </button>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          <p className="text-sm text-slate-500">
            You punched in on{' '}
            <span className="font-semibold text-slate-700">
              {formatFullDate(record.attendance_date)}
            </span>{' '}
            at{' '}
            <span className="font-semibold text-slate-700">
              {formatTime(record.punch_in)}
            </span>{' '}
            but never punched out. When did you leave?
          </p>
          <div>
            <label className="label" htmlFor="recover-out">
              Punch out time
            </label>
            <input
              id="recover-out"
              type="time"
              className="input text-lg"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              autoFocus
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Suggested as 8 hours after punch-in. Working hours recalculate
              automatically.
            </p>
          </div>

          {err && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            That wasn&apos;t a work day — clear it
          </button>
        </div>
      </Dialog>
    </>
  )
}
