import type { LeaveType } from '@/types'

/** All leave types in display order. */
export const LEAVE_TYPES: LeaveType[] = ['Casual', 'Sick', 'Personal', 'Other']

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
