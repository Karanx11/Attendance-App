import type { AttendanceRecord, LeaveType } from '@/types'

/** All leave types in display order. */
export const LEAVE_TYPES: LeaveType[] = ['Casual', 'Sick', 'Personal', 'Other']

/** Count leave days per type from a set of attendance records. */
export function countLeaveByType(records: AttendanceRecord[]): Record<LeaveType, number> {
  const counts: Record<LeaveType, number> = { Casual: 0, Sick: 0, Personal: 0, Other: 0 }
  for (const r of records) {
    if (r.status === 'Leave') {
      const t = (r.leave_type as LeaveType) ?? 'Other'
      counts[t] = (counts[t] ?? 0) + 1
    }
  }
  return counts
}

/**
 * Yearly leave allowance per type. Stored per-browser in localStorage and
 * editable from the Balances view. A quota of 0 means "no limit — just track
 * how many were taken".
 */
export const DEFAULT_LEAVE_QUOTAS: Record<LeaveType, number> = {
  Casual: 12,
  Sick: 12,
  Personal: 6,
  Other: 0,
}

const KEY = 'leave-quotas'

export function getLeaveQuotas(): Record<LeaveType, number> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_LEAVE_QUOTAS }
    const parsed = JSON.parse(raw) as Partial<Record<LeaveType, number>>
    return { ...DEFAULT_LEAVE_QUOTAS, ...parsed }
  } catch {
    return { ...DEFAULT_LEAVE_QUOTAS }
  }
}

export function setLeaveQuotas(q: Record<LeaveType, number>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(q))
  } catch {
    /* ignore */
  }
}
