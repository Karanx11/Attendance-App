import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  OUTBOX_EVENT,
  SYNCED_EVENT,
  pendingCount,
} from '@/services/offlineQueue'

/**
 * A slim status strip: shows when you're offline, and while queued changes are
 * still waiting to sync after reconnecting. Hidden when online and in sync.
 */
export function OfflineBanner() {
  const online = useOnlineStatus()
  const [pending, setPending] = useState(() => pendingCount())

  useEffect(() => {
    const update = () => setPending(pendingCount())
    window.addEventListener(OUTBOX_EVENT, update)
    window.addEventListener(SYNCED_EVENT, update)
    window.addEventListener('online', update)
    return () => {
      window.removeEventListener(OUTBOX_EVENT, update)
      window.removeEventListener(SYNCED_EVENT, update)
      window.removeEventListener('online', update)
    }
  }, [])

  if (online && pending === 0) return null

  const syncing = online && pending > 0

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-semibold ${
        syncing
          ? 'bg-brand-600 text-white'
          : 'bg-amber-500 text-white'
      }`}
      role="status"
    >
      {syncing ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Syncing {pending} change{pending === 1 ? '' : 's'}…
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          You&apos;re offline — changes are saved here and will sync when you
          reconnect.
        </>
      )}
    </div>
  )
}
