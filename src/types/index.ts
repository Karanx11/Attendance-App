export type AttendanceStatus = 'Present' | 'WFH' | 'Leave'

export type LeaveType = 'Casual' | 'Sick' | 'Personal' | 'Other'

export interface Profile {
  id: string
  user_id: string
  name: string | null
  email: string | null
  working_days: number[] | null // 0=Sun .. 6=Sat
  office_name: string | null
  office_location: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  user_id: string
  attendance_date: string // 'YYYY-MM-DD'
  status: AttendanceStatus
  punch_in: string | null // ISO timestamp (UTC)
  punch_out: string | null // ISO timestamp (UTC)
  total_minutes: number | null
  leave_type: LeaveType | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Holiday {
  id: string
  holiday_date: string // 'YYYY-MM-DD'
  holiday_name: string
  country: string
  created_at: string
}

/** Resolved status of a single calendar day, used for rendering. */
export type DayKind =
  | 'present'
  | 'wfh'
  | 'leave'
  | 'weekend'
  | 'holiday'
  | 'absent'
  | 'future'
  | 'unmarked'
  | 'today'

export interface DayInfo {
  date: string // 'YYYY-MM-DD'
  kind: DayKind
  record: AttendanceRecord | null
  holiday: Holiday | null
  isWeekend: boolean
  isToday: boolean
  isFuture: boolean
}

export interface MonthStats {
  present: number
  wfh: number
  leave: number
  absent: number
  workingDays: number
  attendancePercent: number
  avgPunchInMinutes: number | null // minutes from midnight, local
  avgPunchOutMinutes: number | null
  avgWorkingMinutes: number | null
}
