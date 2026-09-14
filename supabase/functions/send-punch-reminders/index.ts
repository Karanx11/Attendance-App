// Supabase Edge Function: send-punch-reminders
// Sends a push notification to each user who, on a working day, has not punched
// in by the time this runs. Trigger it daily via cron (see PUSH_SETUP.md).
//
// Runtime env (set as function secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@x.com)
//   CRON_SECRET  (optional shared secret; if set, callers must send it)
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const TZ = 'Asia/Kolkata' // reminder logic runs in this timezone

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:reminder@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

interface Sub {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

function todayInfo(): { dateKey: string; dow: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const dateKey = parts // en-CA → 'YYYY-MM-DD'
  const dow = new Date(`${dateKey}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat
  return { dateKey, dow }
}

Deno.serve(async (req) => {
  // Optional shared-secret guard for the cron caller.
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return new Response('Forbidden', { status: 403 })
  }

  const { dateKey, dow } = todayInfo()

  // Global holiday? Then nobody gets nudged.
  const { data: holiday } = await supabase
    .from('holidays')
    .select('holiday_date')
    .eq('holiday_date', dateKey)
    .maybeSingle()
  if (holiday) {
    return Response.json({ ok: true, skipped: 'holiday', dateKey })
  }

  // Every device subscription.
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })

  const byUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) {
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  }

  let sent = 0
  let skipped = 0

  for (const [userId, userSubs] of byUser) {
    // Working-day check from the user's profile (default Mon–Fri).
    const { data: profile } = await supabase
      .from('profiles')
      .select('working_days')
      .eq('user_id', userId)
      .maybeSingle()
    const workingDays: number[] =
      profile?.working_days && profile.working_days.length
        ? profile.working_days
        : [1, 2, 3, 4, 5]
    if (!workingDays.includes(dow)) {
      skipped++
      continue
    }

    // Already handled today? (punched in, or on leave)
    const { data: att } = await supabase
      .from('attendance')
      .select('punch_in, status')
      .eq('user_id', userId)
      .eq('attendance_date', dateKey)
      .maybeSingle()
    if (att && (att.punch_in || att.status === 'Leave')) {
      skipped++
      continue
    }

    const payload = JSON.stringify({
      title: 'Punch in reminder ⏰',
      body: "You haven't punched in yet today. Tap to mark your attendance.",
      url: '/home',
    })

    for (const s of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
        sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        // Gone / not found → prune the dead subscription.
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    }
  }

  return Response.json({ ok: true, dateKey, sent, skipped })
})
