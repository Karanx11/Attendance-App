# Background punch-in reminders (push even when the app is closed)

This makes the 10 AM reminder arrive as a real push notification even when the
app is fully closed. It uses your service worker + a Supabase Edge Function that
runs on a daily schedule and sends Web Push.

> Requirements: the app must be **served over HTTPS** (deploy it) and, on
> iPhone, **installed to the Home Screen** (iOS 16.4+). Android works installed
> or in the browser. It cannot work from `npm run dev` or plain `localhost` on
> your phone.

You'll need the **Supabase CLI** for one command (deploying the function):
<https://supabase.com/docs/guides/cli>.

---

## 1. Generate VAPID keys (one time)

VAPID keys authorize your server to send push to the browser's push service.

```bash
npx web-push generate-vapid-keys
```

You get a **Public Key** and a **Private Key**. Keep the private one secret.

## 2. Create the table

Run [`supabase/migration_push.sql`](migration_push.sql) in
**Supabase → SQL Editor**.

## 3. Add the frontend env var

In your `.env` (and in your hosting provider's env settings), add the **public**
key, then rebuild/redeploy the site:

```env
VITE_VAPID_PUBLIC_KEY=<your VAPID public key>
```

## 4. Deploy the Edge Function

From the project root (log in + link first if you haven't:
`supabase login` then `supabase link --project-ref <your-ref>`):

```bash
supabase functions deploy send-punch-reminders --no-verify-jwt
```

`--no-verify-jwt` lets the cron job call it; access is instead guarded by the
`CRON_SECRET` below.

## 5. Set the function secrets

Pick any long random string for `CRON_SECRET` (e.g. `openssl rand -hex 16`).

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=<public key> \
  VAPID_PRIVATE_KEY=<private key> \
  VAPID_SUBJECT=mailto:you@example.com \
  CRON_SECRET=<random string>
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.)

## 6. Schedule it daily (10:00 AM IST = 04:30 UTC)

In **SQL Editor**, enable the extensions once, then create the cron job. Replace
`<PROJECT_REF>` and `<CRON_SECRET>`:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'punch-in-reminders',
  '30 4 * * *',                       -- 04:30 UTC = 10:00 IST, daily
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-punch-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    )
  );
  $$
);
```

To change the time later: `select cron.unschedule('punch-in-reminders');` then
re-create with a new cron expression. (Cron is always UTC — subtract 5h30m from
your desired IST time.)

## 7. Turn it on in the app

1. Deploy the site with `VITE_VAPID_PUBLIC_KEY` set, open it over HTTPS.
2. On your phone, **install** it (Settings → Install app, or Add to Home Screen).
3. Open **Settings → Reminders → Enable notifications** and allow.
   - This subscribes your device and saves it to `push_subscriptions`.
4. Now close the app. At 10 AM on a working day, if you haven't punched in,
   you'll get a push.

## Test it now (without waiting for 10 AM)

Invoke the function manually (it still checks working-day + not-punched-in):

```bash
curl -X POST \
  'https://<PROJECT_REF>.supabase.co/functions/v1/send-punch-reminders' \
  -H 'x-cron-secret: <CRON_SECRET>'
```

It returns JSON like `{"ok":true,"dateKey":"2026-09-14","sent":1,"skipped":0}`.
If `sent` is 0, either you've already punched in, it's not a working day, or no
device is subscribed yet.

---

### How it decides to remind you
On each run it checks, in your timezone (Asia/Kolkata): is today a holiday? is it
one of your working days? do you already have a punch-in or a Leave for today?
Only if it's a working, non-holiday day with no punch-in does it send. Dead
subscriptions (uninstalled/expired) are pruned automatically.
