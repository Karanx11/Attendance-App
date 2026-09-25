import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function storeSubscription(userId: string, sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      subscription: json,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
}

export interface SubscribeResult {
  ok: boolean
  reason?: string
}

/**
 * Ask for notification permission (if needed), subscribe to push, and store the
 * subscription. Must be called from a user gesture the first time.
 */
export async function subscribeToPush(userId: string): Promise<SubscribeResult> {
  if (!isPushSupported()) return { ok: false, reason: 'Notifications are not supported on this device/browser.' }
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'Push is not configured (missing VAPID key).' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: 'Notification permission was not granted.' }
  }

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }
    await storeSubscription(userId, sub)
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: (e as Error).message || 'Could not subscribe to notifications.' }
  }
}

/** If already granted, silently make sure a subscription exists and is stored. */
export async function syncPushSubscription(userId: string): Promise<void> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return
  if (Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }
    await storeSubscription(userId, sub)
  } catch {
    /* best-effort */
  }
}

/** Unsubscribe on this device and remove the stored row. */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!isPushSupported()) return
  try {
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
  } catch {
    /* best-effort */
  }
}
