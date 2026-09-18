import type jsPDF from 'jspdf'
import type { DayInfo, MonthStats } from '@/types'
import {
  formatDuration,
  formatFullDate,
  formatMonthName,
  formatTimeFromMinutes,
  formatWeekday,
  fromDateKey,
} from './date'

export interface ReportOptions {
  from: string
  to: string
  /** Day-by-day rows (caller filters out future days). */
  days: DayInfo[]
  stats: MonthStats
  personName: string
}

/** Fixed columns: simple, readable, weekend-aware. */
const HEADER = ['Date', 'Day', 'Month', 'Status']

/** Human-readable status for a single day, including weekends & holidays. */
export function dayStatusLabel(d: DayInfo): string {
  const r = d.record
  if (r) {
    if (r.status === 'Leave') {
      return r.leave_type ? `Leave (${r.leave_type})` : 'Leave'
    }
    return r.status // Present / WFH
  }
  if (d.holiday) return `Holiday — ${d.holiday.holiday_name}`
  const dow = fromDateKey(d.date).getDay()
  if (dow === 6) return 'Saturday'
  if (dow === 0) return 'Sunday'
  if (d.isFuture) return 'Upcoming'
  return 'Absent'
}

function dayRow(d: DayInfo): string[] {
  return [
    formatFullDate(d.date), // 27 July 2026 (text — never shows as ####)
    formatWeekday(d.date), // Monday
    formatMonthName(d.date), // July 2026
    dayStatusLabel(d), // Present / WFH / Leave / Saturday / Sunday / Holiday / Absent
  ]
}

function summaryPairs(stats: MonthStats): [string, string][] {
  const pairs: [string, string][] = [
    ['Working Days', String(stats.workingDays)],
    ['Present', String(stats.present)],
    ['WFH', String(stats.wfh)],
    ['Leave', String(stats.leave)],
    ['Absent', String(stats.absent)],
    ['Attendance', `${stats.attendancePercent}%`],
  ]
  if (stats.avgWorkingMinutes != null) {
    pairs.push(['Avg Working Hours', formatDuration(stats.avgWorkingMinutes)])
  }
  return pairs
}

// ── CSV ──────────────────────────────────────────────────────────────────

export function buildCsv(opts: ReportOptions): string {
  const { days, stats } = opts
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines: string[] = []

  lines.push(HEADER.map(esc).join(','))
  for (const d of days) lines.push(dayRow(d).map(esc).join(','))

  lines.push('')
  lines.push(esc('Summary'))
  for (const [k, v] of summaryPairs(stats)) {
    lines.push([esc(k), esc(v)].join(','))
  }
  return lines.join('\r\n')
}

// ── Excel (.xlsx) ──────────────────────────────────────────────────────────

/**
 * Build a real .xlsx workbook (lazy-loads SheetJS). Sheet 1 lists every day
 * (Date / Day / Month / Status, weekends included); Sheet 2 is the summary.
 * Dates are written as text with wide columns so Excel never shows "####".
 */
export async function buildXlsx(opts: ReportOptions): Promise<Blob> {
  const XLSX = await import('xlsx')
  const { days, stats, personName, from, to } = opts

  const body = days.map(dayRow)
  const ws = XLSX.utils.aoa_to_sheet([HEADER, ...body])
  ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 26 }]
  if (body.length > 0) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: body.length, c: HEADER.length - 1 },
      }),
    }
  }

  const summaryAoa: (string | number)[][] = [
    ['Attendance Report'],
    [personName],
    [`${formatFullDate(from)}  to  ${formatFullDate(to)}`],
    [],
    ...summaryPairs(stats),
  ]
  if (stats.avgPunchInMinutes != null) {
    summaryAoa.push(['Avg Punch In', formatTimeFromMinutes(stats.avgPunchInMinutes)])
  }
  if (stats.avgPunchOutMinutes != null) {
    summaryAoa.push(['Avg Punch Out', formatTimeFromMinutes(stats.avgPunchOutMinutes)])
  }
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa)
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 24 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ── PDF ──────────────────────────────────────────────────────────────────

export async function buildPdf(opts: ReportOptions): Promise<jsPDF> {
  const { days, stats, personName, from, to } = opts
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new JsPDF({ unit: 'pt', format: 'a4' })

  doc.setFontSize(18)
  doc.setTextColor(107, 70, 40)
  doc.text('Attendance Report', 40, 48)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(personName, 40, 66)
  doc.text(`${formatFullDate(from)}  —  ${formatFullDate(to)}`, 40, 80)

  autoTable(doc, {
    startY: 100,
    head: [HEADER],
    body: days.map(dayRow),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [133, 88, 50], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 243, 238] },
    margin: { left: 40, right: 40 },
  })

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    120
  let y = finalY + 28

  doc.setFontSize(13)
  doc.setTextColor(107, 70, 40)
  doc.text('Summary', 40, y)
  y += 18

  doc.setFontSize(10)
  doc.setTextColor(60)
  for (const [k, v] of summaryPairs(stats)) {
    doc.text(`${k}:`, 40, y)
    doc.setTextColor(15, 23, 42)
    doc.text(v, 160, y)
    doc.setTextColor(60)
    y += 16
  }

  return doc
}

// ── Download / print / share helpers ──────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function printHtmlReport(opts: ReportOptions): void {
  const { days, stats, personName, from, to } = opts
  const rows = days.map(dayRow)

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) throw new Error('Popup blocked. Allow popups to print.')

  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
    <title>Attendance Report</title>
    <style>
      * { font-family: Inter, system-ui, sans-serif; }
      body { padding: 32px; color: #0f172a; }
      h1 { color: #6b4628; margin: 0 0 4px; font-size: 22px; }
      .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      th { background: #855832; color: #fff; text-align: left; padding: 8px 10px; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8f3ee; }
      h2 { color: #6b4628; font-size: 16px; margin: 24px 0 8px; }
      .summary td:first-child { color: #64748b; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>Attendance Report</h1>
    <div class="meta">${personName} &middot; ${formatFullDate(from)} — ${formatFullDate(to)}</div>
    <table><thead><tr>${HEADER.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows
      .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>
    <h2>Summary</h2>
    <table class="summary"><tbody>${summaryPairs(stats)
      .map(([k, v]) => `<tr><td>${k}</td><td><strong>${v}</strong></td></tr>`)
      .join('')}</tbody></table>
    </body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

/** Try the Web Share API with a file; returns false if unsupported. */
export async function shareReport(
  blob: Blob,
  filename: string,
  title: string
): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type })
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: title })
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return true
      return false
    }
  }
  return false
}

export function summaryText(opts: ReportOptions): string {
  const { stats, from, to } = opts
  return [
    `Attendance ${formatFullDate(from)} — ${formatFullDate(to)}`,
    `Present: ${stats.present}  WFH: ${stats.wfh}  Leave: ${stats.leave}  Absent: ${stats.absent}`,
    `Attendance: ${stats.attendancePercent}%`,
  ].join('\n')
}
