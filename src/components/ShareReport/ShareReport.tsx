import { useEffect, useState } from 'react'
import {
  CalendarRange,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Share2,
} from 'lucide-react'
import { useRangeData } from '@/hooks/useRangeData'
import { useToast } from '../Toast/ToastProvider'
import { Spinner } from '../ui/Skeleton'
import {
  buildCsv,
  buildPdf,
  buildXlsx,
  downloadBlob,
  printHtmlReport,
  shareReport,
  summaryText,
  type ReportOptions,
} from '@/utils/report'
import { formatShortDate } from '@/utils/date'

interface Props {
  /** The Reports page's current range — used as the default export range. */
  defaultFrom: string
  defaultTo: string
  personName: string
}

export function ShareReport({ defaultFrom, defaultTo, personName }: Props) {
  const toast = useToast()

  const [custom, setCustom] = useState(false)
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  // Follow the page's range while the custom picker is off.
  useEffect(() => {
    if (!custom) {
      setFrom(defaultFrom)
      setTo(defaultTo)
    }
  }, [defaultFrom, defaultTo, custom])

  const invalid = from > to
  const { dayInfos, stats, loading } = useRangeData(from, invalid ? from : to)

  // Every day up to today (skip empty future days), weekends included.
  const days = dayInfos.filter((d) => !d.isFuture)

  const [pending, setPending] = useState<string | null>(null)

  const opts = (): ReportOptions => ({ from, to, days, stats, personName })
  const baseName = `attendance_${from}_to_${to}`

  const guard = async (label: string, fn: () => void | Promise<void>) => {
    if (invalid) {
      toast.error('"From" date is after "To" date.')
      return
    }
    if (days.length === 0) {
      toast.info('No days in this range to export.')
      return
    }
    setPending(label)
    try {
      await fn()
    } catch (e) {
      toast.error((e as Error).message || 'Report failed.')
    } finally {
      setPending(null)
    }
  }

  const handleExcel = () =>
    guard('excel', async () => {
      const blob = await buildXlsx(opts())
      downloadBlob(blob, `${baseName}.xlsx`)
      toast.success('Excel file downloaded.')
    })

  const handleCsv = () =>
    guard('csv', () => {
      const blob = new Blob([buildCsv(opts())], { type: 'text/csv;charset=utf-8;' })
      downloadBlob(blob, `${baseName}.csv`)
      toast.success('CSV downloaded.')
    })

  const handlePdf = () =>
    guard('pdf', async () => {
      const doc = await buildPdf(opts())
      doc.save(`${baseName}.pdf`)
      toast.success('PDF generated.')
    })

  const handlePrint = () =>
    guard('print', () => {
      printHtmlReport(opts())
    })

  const handleShare = () =>
    guard('share', async () => {
      const blob = await buildXlsx(opts())
      const shared = await shareReport(blob, `${baseName}.xlsx`, 'Attendance Report')
      if (shared) {
        toast.success('Shared.')
        return
      }
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
      if (nav.share) {
        try {
          await nav.share({ title: 'Attendance Report', text: summaryText(opts()) })
          toast.success('Shared.')
          return
        } catch {
          /* fall through to download */
        }
      }
      downloadBlob(blob, `${baseName}.xlsx`)
      toast.info('Sharing not supported — downloaded the Excel file instead.')
    })

  const disabled = pending !== null || loading

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Share2 className="h-5 w-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-800">Share / Export Attendance</h2>
      </div>

      {/* Range control */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setCustom((c) => !c)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
            custom
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
          }`}
        >
          <CalendarRange className="h-4 w-4" />
          {custom ? 'Using custom range' : 'Custom date range'}
        </button>

        {custom && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="share-from">From</label>
              <input
                id="share-from"
                type="date"
                className="input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="share-to">To</label>
              <input
                id="share-to"
                type="date"
                className="input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <p className="mb-1 text-sm text-slate-500">
        {invalid ? (
          <span className="font-medium text-red-600">"From" date is after "To" date.</span>
        ) : (
          <>
            Exporting <span className="font-semibold text-slate-700">{days.length}</span>{' '}
            day{days.length === 1 ? '' : 's'} · {formatShortDate(from)} –{' '}
            {formatShortDate(to)}
          </>
        )}
      </p>
      <p className="mb-5 text-xs text-slate-400">
        Columns: Date, Day, Month &amp; Status — every day including Saturdays, Sundays
        &amp; holidays.
      </p>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <button className="btn-primary" onClick={handleExcel} disabled={disabled}>
          {pending === 'excel' ? <Spinner className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
          Excel
        </button>
        <button className="btn-secondary" onClick={handlePdf} disabled={disabled}>
          {pending === 'pdf' ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          PDF
        </button>
        <button className="btn-secondary" onClick={handleCsv} disabled={disabled}>
          {pending === 'csv' ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          CSV
        </button>
        <button className="btn-secondary" onClick={handlePrint} disabled={disabled}>
          {pending === 'print' ? <Spinner className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
          Print
        </button>
        <button className="btn-secondary" onClick={handleShare} disabled={disabled}>
          {pending === 'share' ? <Spinner className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          Share
        </button>
      </div>
    </div>
  )
}
