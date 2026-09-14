import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AttendanceRecord, DayInfo, Holiday, MonthStats } from '@/types'
import { getAttendanceRange, getHolidays } from '@/services/attendance'
import {
  buildDayInfos,
  computeStats,
  toHolidayMap,
  toRecordMap,
} from '@/utils/attendance'
import { eachDateKey } from '@/utils/date'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'

interface RangeData {
  records: AttendanceRecord[]
  recordsByDate: Map<string, AttendanceRecord>
  holidaysByDate: Map<string, Holiday>
  dayInfos: DayInfo[]
  stats: MonthStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch attendance + holidays for an inclusive [start, end] date range and
 * derive day-by-day info and aggregate stats. Re-runs when the range changes.
 */
export function useRangeData(start: string, end: string): RangeData {
  const { user } = useAuth()
  const { workingDays } = useProfile()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [recs, hols] = await Promise.all([
        getAttendanceRange(user.id, start, end),
        getHolidays(start, end),
      ])
      setRecords(recs)
      setHolidays(hols)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [user, start, end])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const recordsByDate = useMemo(() => toRecordMap(records), [records])
  const holidaysByDate = useMemo(() => toHolidayMap(holidays), [holidays])
  const holidaySet = useMemo(
    () => new Set(holidays.map((h) => h.holiday_date)),
    [holidays]
  )

  const dayInfos = useMemo(
    () =>
      buildDayInfos(
        eachDateKey(start, end),
        recordsByDate,
        holidaysByDate,
        workingDays
      ),
    [start, end, recordsByDate, holidaysByDate, workingDays]
  )

  const stats = useMemo(
    () => computeStats(start, end, recordsByDate, holidaySet, workingDays),
    [start, end, recordsByDate, holidaySet, workingDays]
  )

  return {
    records,
    recordsByDate,
    holidaysByDate,
    dayInfos,
    stats,
    loading,
    error,
    refetch,
  }
}
