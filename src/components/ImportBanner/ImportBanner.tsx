import { useState } from 'react'
import { Sparkles, Upload, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '../Toast/ToastProvider'
import { Spinner } from '../ui/Skeleton'
import { bulkImportAttendance, friendlyError } from '@/services/attendance'
import { ATTENDANCE_IMPORT } from '@/data/attendanceImport'

const FLAG = 'attendance-history-imported'

function readFlag(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}
function writeFlag() {
  try {
    localStorage.setItem(FLAG, '1')
  } catch {
    /* ignore */
  }
}

/**
 * One-time prompt to import historical attendance (from the spreadsheet) into
 * Supabase through the logged-in session. Hidden once imported or dismissed.
 */
export function ImportBanner({ onImported }: { onImported: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const [hidden, setHidden] = useState(readFlag())
  const [importing, setImporting] = useState(false)

  if (hidden) return null

  const runImport = async () => {
    if (!user) return
    setImporting(true)
    try {
      const count = await bulkImportAttendance(user.id, ATTENDANCE_IMPORT)
      writeFlag()
      setHidden(true)
      onImported()
      toast.success(
        count > 0
          ? `Imported ${count} day${count === 1 ? '' : 's'} of history.`
          : 'History already up to date.'
      )
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setImporting(false)
    }
  }

  const dismiss = () => {
    writeFlag()
    setHidden(true)
  }

  return (
    <div className="glass-card flex flex-col gap-3 border-amber-200/70 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/90">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Import your attendance history</p>
          <p className="text-xs text-slate-500">
            Loads your records from 27 Jul 2026 onward. Won&apos;t overwrite days you
            already have.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="btn-primary" onClick={runImport} disabled={importing}>
          {importing ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          Import now
        </button>
        <button
          onClick={dismiss}
          disabled={importing}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/60 hover:text-slate-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
