// Supabase Edge Function: sends a "shift complete" web push to users who
// punched in ~8 hours ago and haven't punched out. Invoke it on a schedule
// (e.g. every 5 minutes) via Supabase Cron / pg_cron.
//
// Required secrets (set with: supabase secrets set ...):
//   VAPID_PUBLIC_KEY   VAPID_PRIVATE_KEY   VAPID_SUBJECT (mailto:you@example.com)
//   CRON_SECRET        (any random string; the scheduler must send it back)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SHIFT_MS = 8 * 60 * 60 * 1000

Deno.serve(async (req) => {
  // Simple shared-secret guard so only the scheduler can trigger sends.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Forbidden', { status: 403 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  )

  const now = Date.now()
  const upper = new Date(now - SHIFT_MS).toISOString() // punched in >= 8h ago
  const lower = new Date(now - 24 * 60 * 60 * 1000).toISOString() // but within 24h

  const { data: due, error } = await supabase
    .from('attendance')
    .select('id, user_id, punch_in')
    .not('punch_in', 'is', null)
    .is('punch_out', null)
    .neq('status', 'Leave')
    .eq('shift_notified', false)
    .lte('punch_in', upper)
    .gte('punch_in', lower)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let sent = 0
  for (const row of due ?? []) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', row.user_id)

    const payload = JSON.stringify({
      title: 'Attendance',
      body: '8 hours complete — you can head home! 🎉',
      url: '/home',
      tag: 'shift-complete',
    })

    let delivered = false
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription, payload)
        delivered = true
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          // Subscription expired — clean it up.
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
      }
    }

    // Mark as notified even if there were no subscriptions, so we don't retry forever.
    await supabase.from('attendance').update({ shift_notified: true }).eq('id', row.id)
    if (delivered) sent++
  }

  return new Response(JSON.stringify({ due: due?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
