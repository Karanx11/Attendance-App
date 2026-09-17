import { useCallback, useEffect } from 'react'
import type { AttendanceEditInput, AttendanceRecord } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/Toast/ToastProvider'
import {
  deleteAttendance,
  friendlyError,
  saveAttendanceEdit,
} from '@/services/attendance'
import {
  flushOutbox,
  isLocalId,
  queueDelete,
  queueUpsert,
} from '@/services/offlineQueue'
import { calcTotalMinutes } from '@/utils/attendance'

interface RangeLike {
  upsertLocal: (record: AttendanceRecord) => void
  removeLocal: (date: string) => void
  refetch: () => Promise<void>
}

function isNetworkError(e: unknown): boolean {
  const msg = (e as { message?: string })?.message ?? ''
  return (
    /Failed to fetch|NetworkError|fetch failed|network|ERR_INTERNET/i.test(msg) ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  )
}

/** Build the optimistic record that an edit produces for a day. */
function buildRecord(
  userId: string,
  date: string,
  edit: AttendanceEditInput,
  existing: AttendanceRecord | null
): AttendanceRecord {
  const isLeave = edit.status === 'Leave'
  const punchIn = isLeave ? null : edit.punchIn
  const punchOut = isLeave ? null : edit.punchOut
  const total =
    !isLeave && punchIn && punchOut ? calcTotalMinutes(punchIn, punchOut) : null
  return {
    id: existing?.id ?? `local-${date}`,
    user_id: userId,
    attendance_date: date,
    status: edit.status,
    punch_in: punchIn,
    punch_out: punchOut,
    total_minutes: total,
    leave_type: isLeave ? edit.leaveType : null,
    notes: edit.notes,
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Offline-aware attendance writes: applies changes to the local view instantly,
 * writes straight to Supabase when online, and queues them (to sync on
 * reconnect) when offline or the network write fails.
 */
export function useAttendanceWrite(range: RangeLike) {
  const { user } = useAuth()
  const toast = useToast()

  // Try to sync any queued writes on mount and whenever we come back online.
  useEffect(() => {
    if (!user) return
    const trySync = () => {
      if (navigator.onLine) void flushOutbox(user.id)
    }
    trySync()
    window.addEventListener('online', trySync)
    return () => window.removeEventListener('online', trySync)
  }, [user])

  const saveDay = useCallback(
    async (
      date: string,
      edit: AttendanceEditInput,
      existing: AttendanceRecord | null,
      okMsg: string
    ) => {
      if (!user) return
      // Optimistic UI update immediately.
      range.upsertLocal(buildRecord(user.id, date, edit, existing))

      if (!navigator.onLine) {
        queueUpsert(date, edit)
        toast.info('Saved offline — will sync when you reconnect.')
        return
      }
      try {
        await saveAttendanceEdit(user.id, date, edit)
        await range.refetch()
        toast.success(okMsg)
      } catch (e) {
        if (isNetworkError(e)) {
          queueUpsert(date, edit)
          toast.info('Saved offline — will sync when you reconnect.')
        } else {
          await range.refetch() // roll back optimistic change
          toast.error(friendlyError(e))
        }
      }
    },
    [user, range, toast]
  )

  const clearDay = useCallback(
    async (date: string, record: AttendanceRecord, okMsg: string) => {
      if (!user) return
      range.removeLocal(date)

      if (!navigator.onLine) {
        queueDelete(date, record.id)
        toast.info('Cleared offline — will sync when you reconnect.')
        return
      }
      // A purely local (unsynced) record has nothing to delete on the server.
      if (isLocalId(record.id)) {
        toast.success(okMsg)
        return
      }
      try {
        await deleteAttendance(user.id, record.id)
        await range.refetch()
        toast.success(okMsg)
      } catch (e) {
        if (isNetworkError(e)) {
          queueDelete(date, record.id)
          toast.info('Cleared offline — will sync when you reconnect.')
        } else {
          await range.refetch()
          toast.error(friendlyError(e))
        }
      }
    },
    [user, range, toast]
  )

  return { saveDay, clearDay }
}
