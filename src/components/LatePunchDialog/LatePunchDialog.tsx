import { useEffect, useState } from 'react'
import { AlertTriangle, LogIn } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Spinner } from '../ui/Skeleton'
import { formatTimeFromMinutes, todayKey } from '@/utils/date'
import {
  dismissLateToday,
  getLateCutoff,
  isLateDismissedToday,
  nowMinutes,
  REMINDER_EVENT,
  timeToMinutes,
} from '@/utils/reminder'

interface Props {
  /** Working day, not on leave, not yet punched in (from Home). */
  eligible: boolean
  busy: boolean
  /** Punch in now (marks Present). */
  onPunchIn: () => void
}

/**
 * A prominent “you’re late” popup shown once per day when it’s past the late
 * cut‑off and you still haven’t punched in. Mark Present, or dismiss and let the
 * day fall to Absent.
 */
export function LatePunchDialog({ eligible, busy, onPunchIn }: Props) {
  const [, setTick] = useState(0)
  const [dismissed, setDismissed] = useState(() => isLateDismissedToday(todayKey()))

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000)
    const onChange = () => setTick((t) => t + 1)
    window.addEventListener(REMINDER_EVENT, onChange)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(REMINDER_EVENT, onChange)
    }
  }, [])

  const cutoff = getLateCutoff()
  const isLate = nowMinutes() >= timeToMinutes(cutoff)
  const open = eligible && isLate && !dismissed

  const close = () => {
    dismissLateToday(todayKey())
    setDismissed(true)
  }

  const cutoffLabel = formatTimeFromMinutes(timeToMinutes(cutoff))

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Running late?"
      footer={
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={close} disabled={busy}>
            Not today
          </button>
          <button className="btn-primary flex-1" onClick={onPunchIn} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            Mark Present
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-sm text-slate-600">
          It&apos;s past <span className="font-bold text-slate-800">{cutoffLabel}</span>{' '}
          and you haven&apos;t punched in yet. Mark yourself{' '}
          <span className="font-bold text-green-600">Present</span> now — otherwise
          today will be counted as{' '}
          <span className="font-bold text-amber-600">Absent</span>.
        </p>
      </div>
    </Dialog>
  )
}
