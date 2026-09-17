import type { AttendanceEditInput } from '@/types'
import { deleteAttendance, saveAttendanceEdit } from './attendance'

/**
 * Offline outbox for attendance writes. When the app is offline (or a write
 * fails on the network), the intended end‑state for a day is queued in
 * localStorage and replayed to Supabase once connectivity returns.
 *
 * Each day has at most one pending entry (latest write wins), modelled as the
 * full desired state so replaying is a simple idempotent upsert (or delete).
 */

const KEY = 'attendance-outbox'
/** Fired whenever the outbox changes (add/remove) — for the offline banner. */
export const OUTBOX_EVENT = 'attendance-outbox-change'
/** Fired after a successful flush so data views can refetch fresh server data. */
export const SYNCED_EVENT = 'attendance-synced'

type Entry =
  | { type: 'upsert'; date: string; edit: AttendanceEditInput; at: number }
  | { type: 'delete'; date: string; recordId: string; at: number }

function read(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Entry[]) : []
  } catch {
    return []
  }
}

function write(list: Entry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    window.dispatchEvent(new Event(OUTBOX_EVENT))
  } catch {
    /* ignore */
  }
}

export function pendingCount(): number {
  return read().length
}

/** Locally-created records use this id prefix (no server row yet). */
export function isLocalId(id: string | null | undefined): boolean {
  return !id || id.startsWith('local-')
}

export function queueUpsert(date: string, edit: AttendanceEditInput): void {
  const list = read().filter((e) => e.date !== date)
  list.push({ type: 'upsert', date, edit, at: Date.now() })
  write(list)
}

export function queueDelete(date: string, recordId: string | null): void {
  // Drop any pending upsert for this day first.
  const list = read().filter((e) => e.date !== date)
  // Only a real server row needs a delete replayed; a purely local one just
  // disappears when its pending upsert is removed above.
  if (!isLocalId(recordId)) {
    list.push({ type: 'delete', date, recordId: recordId as string, at: Date.now() })
  }
  write(list)
}

let flushing = false

/**
 * Replay queued writes to Supabase in order. Stops at the first failure
 * (assumed transient / offline again). Returns how many entries synced.
 */
export async function flushOutbox(userId: string): Promise<number> {
  if (flushing || typeof navigator !== 'undefined' && !navigator.onLine) return 0
  const queue = read()
  if (queue.length === 0) return 0
  flushing = true
  let synced = 0
  try {
    for (const entry of queue) {
      try {
        if (entry.type === 'upsert') {
          await saveAttendanceEdit(userId, entry.date, entry.edit)
        } else {
          await deleteAttendance(userId, entry.recordId)
        }
        // Remove just this entry (match by date + timestamp).
        write(read().filter((e) => !(e.date === entry.date && e.at === entry.at)))
        synced++
      } catch {
        break
      }
    }
  } finally {
    flushing = false
  }
  if (synced > 0) window.dispatchEvent(new Event(SYNCED_EVENT))
  return synced
}
