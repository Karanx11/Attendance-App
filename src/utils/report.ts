import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AttendanceRecord, MonthStats } from '@/types'
import {
  formatDuration,
  formatFullDate,
  formatTime,
  formatTimeFromMinutes,
} from './date'

export interface ReportField {
  status: boolean
  punchIn: boolean
  punchOut: boolean
  totalHours: boolean
  attendancePercent: boolean
}

export interface ReportOptions {
  from: string
  to: string
  fields: ReportField
  records: AttendanceRecord[]
  stats: MonthStats
  personName: string
}

function buildHeader(fields: ReportField): string[] {
  const cols = ['Date']
  if (fields.status) cols.push('Status')
  if (fields.punchIn) cols.push('Punch In')
  if (fields.punchOut) cols.push('Punch Out')
  if (fields.totalHours) cols.push('Total Hours')
  return cols
}

function buildRow(r: AttendanceRecord, fields: ReportField): string[] {
  const row = [formatFullDate(r.attendance_date)]
  if (fields.status) {
    row.push(r.status === 'Leave' && r.leave_type ? `Leave (${r.leave_type})` : r.status)
  }
  if (fields.punchIn) row.push(r.punch_in ? formatTime(r.punch_in) : '—')
  if (fields.punchOut) row.push(r.punch_out ? formatTime(r.punch_out) : '—')
  if (fields.totalHours) row.push(r.total_minutes ? formatDuration(r.total_minutes) : '—')
  return row
}

// ── CSV ──────────────────────────────────────────────────────────────────

export function buildCsv(opts: ReportOptions): string {
  const { records, fields, stats } = opts
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines: string[] = []

  lines.push(buildHeader(fields).map(esc).join(','))
  for (const r of records) {
    lines.push(buildRow(r, fields).map(esc).join(','))
  }

  lines.push('')
  lines.push(esc('Summary').concat(','))
  lines.push([esc('Working Days'), esc(String(stats.workingDays))].join(','))
  lines.push([esc('Present'), esc(String(stats.present))].join(','))
  lines.push([esc('WFH'), esc(String(stats.wfh))].join(','))
  lines.push([esc('Leave'), esc(String(stats.leave))].join(','))
  lines.push([esc('Absent'), esc(String(stats.absent))].join(','))
  if (fields.attendancePercent) {
    lines.push([esc('Attendance %'), esc(`${stats.attendancePercent}%`)].join(','))
  }
  return lines.join('\r\n')
}

// ── PDF ──────────────────────────────────────────────────────────────────

export function buildPdf(opts: ReportOptions): jsPDF {
  const { records, fields, stats, personName, from, to } = opts
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  doc.setFontSize(18)
  doc.setTextColor(30, 64, 175)
  doc.text('Attendance Report', 40, 48)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(personName, 40, 66)
  doc.text(`${formatFullDate(from)}  —  ${formatFullDate(to)}`, 40, 80)

  autoTable(doc, {
    startY: 100,
    head: [buildHeader(fields)],
    body: records.map((r) => buildRow(r, fields)),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    margin: { left: 40, right: 40 },
  })

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    120
  let y = finalY + 28

  doc.setFontSize(13)
  doc.setTextColor(30, 64, 175)
  doc.text('Summary', 40, y)
  y += 18

  doc.setFontSize(10)
  doc.setTextColor(60)
  const summary: [string, string][] = [
    ['Working Days', String(stats.workingDays)],
    ['Present', String(stats.present)],
    ['WFH', String(stats.wfh)],
    ['Leave', String(stats.leave)],
    ['Absent', String(stats.absent)],
  ]
  if (fields.attendancePercent) {
    summary.push(['Attendance', `${stats.attendancePercent}%`])
  }
  if (stats.avgWorkingMinutes != null) {
    summary.push(['Avg Working Hours', formatDuration(stats.avgWorkingMinutes)])
  }
  for (const [k, v] of summary) {
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
  const { records, fields, stats, personName, from, to } = opts
  const header = buildHeader(fields)
  const rows = records.map((r) => buildRow(r, fields))

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) throw new Error('Popup blocked. Allow popups to print.')

  const summaryRows: [string, string][] = [
    ['Working Days', String(stats.workingDays)],
    ['Present', String(stats.present)],
    ['WFH', String(stats.wfh)],
    ['Leave', String(stats.leave)],
    ['Absent', String(stats.absent)],
  ]
  if (fields.attendancePercent) {
    summaryRows.push(['Attendance', `${stats.attendancePercent}%`])
  }

  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
    <title>Attendance Report</title>
    <style>
      * { font-family: Inter, system-ui, sans-serif; }
      body { padding: 32px; color: #0f172a; }
      h1 { color: #1e40af; margin: 0 0 4px; font-size: 22px; }
      .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      th { background: #2563eb; color: #fff; text-align: left; padding: 8px 10px; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #eff6ff; }
      h2 { color: #1e40af; font-size: 16px; margin: 24px 0 8px; }
      .summary td:first-child { color: #64748b; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>Attendance Report</h1>
    <div class="meta">${personName} &middot; ${formatFullDate(from)} — ${formatFullDate(to)}</div>
    <table><thead><tr>${header.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows
      .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>
    <h2>Summary</h2>
    <table class="summary"><tbody>${summaryRows
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
      // User cancelled — treat as handled.
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
    stats.avgPunchInMinutes != null
      ? `Avg In: ${formatTimeFromMinutes(stats.avgPunchInMinutes)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}
