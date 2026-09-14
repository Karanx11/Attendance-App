import type { AttendanceStatus } from '@/types'

export interface ImportRow {
  date: string // 'YYYY-MM-DD'
  status: AttendanceStatus
  notes?: string
}

/**
 * Historical attendance imported from Karan-Sharma-Attendance.xlsx
 * (27 Jul 2026 – 14 Sep 2026). Weekends are omitted (auto-coloured by the app).
 * Corrections applied: Sat 22 Aug treated as weekend; Mon 24 Aug is Present.
 * Import is idempotent and never overwrites a day you have already recorded.
 */
export const ATTENDANCE_IMPORT: ImportRow[] = [
  { date: '2026-07-27', status: 'Present', notes: 'Joining Date' },
  { date: '2026-07-28', status: 'Present' },
  { date: '2026-07-29', status: 'Present' },
  { date: '2026-07-30', status: 'Present' },
  { date: '2026-07-31', status: 'Present' },
  { date: '2026-08-03', status: 'Present' },
  { date: '2026-08-04', status: 'Present' },
  { date: '2026-08-05', status: 'Present' },
  { date: '2026-08-06', status: 'Present' },
  { date: '2026-08-07', status: 'Present' },
  { date: '2026-08-10', status: 'Present' },
  { date: '2026-08-11', status: 'WFH' },
  { date: '2026-08-12', status: 'Leave' },
  { date: '2026-08-13', status: 'Leave' },
  { date: '2026-08-14', status: 'WFH' },
  { date: '2026-08-17', status: 'Leave' },
  { date: '2026-08-18', status: 'WFH' },
  { date: '2026-08-19', status: 'Present' },
  { date: '2026-08-20', status: 'Present' },
  { date: '2026-08-21', status: 'Present' },
  { date: '2026-08-24', status: 'Present' },
  { date: '2026-08-25', status: 'Present' },
  { date: '2026-08-26', status: 'Present' },
  { date: '2026-08-27', status: 'Present' },
  { date: '2026-08-28', status: 'Present' },
  { date: '2026-08-31', status: 'Present' },
  { date: '2026-09-01', status: 'Present' },
  { date: '2026-09-02', status: 'Present' },
  { date: '2026-09-03', status: 'Present' },
  { date: '2026-09-04', status: 'Leave' },
  { date: '2026-09-07', status: 'Present' },
  { date: '2026-09-08', status: 'Present' },
  { date: '2026-09-09', status: 'Present' },
  { date: '2026-09-10', status: 'Leave' },
  { date: '2026-09-11', status: 'Leave' },
  { date: '2026-09-14', status: 'Present' },
]
