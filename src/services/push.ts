import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC = (
  import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
)?.trim()

/** True when a VAPID public key is configured — background push is possible. */
export function pushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC)
}

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Subscribe this device to background push and store the subscription in
 * Supabase, so the daily edge function can reach it even when the app is closed.
 */
export async function subscribeToPush(userId: string): Promise<void> {
  if (!VAPID_PUBLIC) {
    throw new Error('Background push is not configured yet (missing VAPID key).')
  }
  if (!pushSupported()) {
    throw new Error('Push notifications are not supported in this browser.')
  }
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast: the Uint8Array's ArrayBufferLike generic isn't assignable to
      // BufferSource in current lib types, but the value is valid.
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
}

/** Remove this device's push subscription (local + Supabase). */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}
