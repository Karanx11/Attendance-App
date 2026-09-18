import type { DayKind } from '@/types'

interface KindStyle {
  /** Solid dot/background color */
  color: string
  /** Tailwind classes for a calendar cell */
  cell: string
  label: string
}

/** Visual mapping for each resolved day kind. */
export const KIND_STYLES: Record<DayKind, KindStyle> = {
  present: {
    color: '#22c55e',
    cell: 'bg-green-500 text-white',
    label: 'Present',
  },
  wfh: {
    color: '#a06f3f',
    cell: 'bg-brand-500 text-white',
    label: 'WFH',
  },
  leave: {
    color: '#800000',
    cell: 'bg-[#800000] text-white',
    label: 'Leave',
  },
  weekend: {
    color: '#ef4444',
    cell: 'bg-red-100 text-red-500',
    label: 'Weekend',
  },
  holiday: {
    color: '#ef4444',
    cell: 'bg-red-100 text-red-500',
    label: 'Holiday',
  },
  absent: {
    color: '#f59e0b',
    cell: 'bg-amber-100 text-amber-600',
    label: 'Absent',
  },
  future: {
    color: '#cbd5e1',
    cell: 'bg-slate-50 text-slate-400',
    label: 'Upcoming',
  },
  unmarked: {
    color: '#cbd5e1',
    cell: 'bg-slate-50 text-slate-400',
    label: 'Unmarked',
  },
  today: {
    color: '#94a3b8',
    cell: 'bg-white text-slate-700 ring-2 ring-brand-400',
    label: 'Today',
  },
}

export const LEGEND: { kind: DayKind; label: string }[] = [
  { kind: 'present', label: 'Present' },
  { kind: 'wfh', label: 'WFH' },
  { kind: 'leave', label: 'Leave' },
  { kind: 'weekend', label: 'Weekend / Holiday' },
  { kind: 'absent', label: 'Absent' },
  { kind: 'future', label: 'Upcoming' },
]
