import { useEffect, useState } from 'react'
import { AlarmClock, LogIn, X } from 'lucide-react'
import { Spinner } from '../ui/Skeleton'
import { greeting, todayKey } from '@/utils/date'
import {
  dismissToday,
  getReminderTime,
  isDismissedToday,
  nowMinutes,
  REMINDER_EVENT,
  timeToMinutes,
} from '@/utils/reminder'

interface Props {
  /** Domain condition from Home: working day, not on leave, not yet punched in. */
  eligible: boolean
  busy: boolean
  onPunchIn: () => void
}

/**
 * A gentle nudge shown on Home when it's a working day, past the reminder time,
 * and you still haven't punched in. Dismissable for the rest of the day.
 */
export function PunchReminder({ eligible, busy, onPunchIn }: Props) {
  const [, setTick] = useState(0)
  const [dismissed, setDismissed] = useState(() => isDismissedToday(todayKey()))

  useEffect(() => {
    // Re-check each minute so the banner appears when the time passes, and
    // re-read after a settings change.
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000)
    const onChange = () => setTick((t) => t + 1)
    window.addEventListener(REMINDER_EVENT, onChange)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(REMINDER_EVENT, onChange)
    }
  }, [])

  if (!eligible || dismissed) return null
  if (nowMinutes() < timeToMinutes(getReminderTime())) return null

  const dismiss = () => {
    dismissToday(todayKey())
    setDismissed(true)
  }

  return (
    <div className="glass-card flex flex-col gap-3 border-amber-200/70 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/90">
          <AlarmClock className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            {greeting()}! You haven&apos;t punched in yet.
          </p>
          <p className="text-xs text-slate-500">
            It&apos;s a working day — mark your attendance to start the clock.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="btn-primary" onClick={onPunchIn} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          Punch In
        </button>
        <button
          onClick={dismiss}
          disabled={busy}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/60 hover:text-slate-600"
          aria-label="Dismiss for today"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
