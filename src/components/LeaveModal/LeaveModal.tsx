import { useEffect, useState } from 'react'
import type { LeaveType } from '@/types'
import { Dialog } from '../ui/Dialog'
import { Spinner } from '../ui/Skeleton'
import { formatFullDate } from '@/utils/date'

const LEAVE_TYPES: LeaveType[] = ['Casual', 'Sick', 'Personal', 'Other']

interface Props {
  open: boolean
  date: string | null
  initialType?: LeaveType | null
  initialNotes?: string | null
  onClose: () => void
  onSave: (type: LeaveType, notes: string) => Promise<void>
}

export function LeaveModal({
  open,
  date,
  initialType,
  initialNotes,
  onClose,
  onSave,
}: Props) {
  const [type, setType] = useState<LeaveType>('Casual')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setType(initialType ?? 'Casual')
      setNotes(initialNotes ?? '')
      setSaving(false)
    }
  }, [open, initialType, initialNotes])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(type, notes.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mark Leave"
      footer={
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}
            Save Leave
          </button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        {date && (
          <p className="text-sm font-medium text-slate-500">{formatFullDate(date)}</p>
        )}

        <div>
          <label className="label">Leave Type</label>
          <div className="grid grid-cols-2 gap-2">
            {LEAVE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  type === t
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="leave-notes">
            Notes
          </label>
          <textarea
            id="leave-notes"
            className="input min-h-[80px] resize-none"
            placeholder="Optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  )
}
