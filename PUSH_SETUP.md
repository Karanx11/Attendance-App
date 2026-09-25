# Closed‑app push notifications — setup

This makes the **"8 hours complete"** alert fire as a system notification even
when the app is fully closed. The app code is already done; these are the
one‑time server/config steps that only you can do (they need your keys and
deploys). Do them in order.

> Note: web push shows the **OS notification** (its standard ding + vibration),
> not a custom looping alarm. On **iPhone** it only works if the app is
> **installed to the Home Screen** (iOS 16.4+).

## 1. Generate VAPID keys
```bash
npx web-push generate-vapid-keys
```
Copy the **Public Key** and **Private Key** it prints. (Keep the private key
secret — never commit it.)

## 2. Add the public key to the web app
- Local: add to `.env`
  ```
  VITE_VAPID_PUBLIC_KEY=<public key>
  ```
- Production: add the same var in **Vercel → Project → Settings → Environment
  Variables**, then redeploy.

## 3. Run the database migration
In **Supabase → SQL Editor**, run the contents of
[`supabase/migration_push.sql`](supabase/migration_push.sql). It creates
`push_subscriptions` and adds `attendance.shift_notified`.

## 4. Deploy the Edge Function
```bash
# one-time
supabase login
supabase link --project-ref <your-project-ref>

# deploy (no JWT so the scheduler can call it; the CRON_SECRET guards it)
supabase functions deploy shift-notify --no-verify-jwt

# secrets (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically)
supabase secrets set \
  VAPID_PUBLIC_KEY="<public key>" \
  VAPID_PRIVATE_KEY="<private key>" \
  VAPID_SUBJECT="mailto:you@example.com" \
  CRON_SECRET="<any long random string>"
```

## 5. Schedule it (every 5 minutes)
In **Supabase → SQL Editor** (needs the `pg_cron` + `pg_net` extensions, which
you can enable under Database → Extensions):
```sql
select cron.schedule(
  'shift-notify-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.functions.supabase.co/shift-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<the CRON_SECRET you set>'
    )
  );
  $$
);
```
(Alternatively, use the Dashboard's **Edge Functions → Schedules** UI and add
the `x-cron-secret` header there.)

## 6. Turn it on, per device
Open the app → **Settings → Reminders → "Enable closed‑app notifications"** and
allow the permission prompt. On iPhone, install the app to the Home Screen
first, then enable it from there.

## 7. Test
- Quick server test:
  ```bash
  curl -X POST 'https://<ref>.functions.supabase.co/shift-notify' \
    -H 'x-cron-secret: <the CRON_SECRET>'
  ```
  It returns `{"due": N, "sent": M}`.
- End‑to‑end: set a row's `punch_in` to ~8h ago with `punch_out` null and
  `shift_notified = false`, then invoke the function (or wait for the cron).

## Troubleshooting (this is what usually breaks it)
- **No notification received:** confirm the function returns `sent > 0`. If
  `due > 0` but `sent = 0`, there's no stored subscription — re‑enable in
  Settings (step 6).
- **Nothing subscribed:** `VITE_VAPID_PUBLIC_KEY` missing at build time, or you
  tested on the dev server. Push needs the **built** app (`npm run build &&
  npm run preview`) or the deployed site — the service worker isn't active on
  `npm run dev` by default.
- **iPhone:** must be installed to the Home Screen; Safari tabs can't receive
  push.
- **Permission blocked:** re‑enable notifications for the site in the browser,
  then reload and enable again.
- **`sent > 0` but still nothing:** check the browser/OS notification settings
  aren't muted / in Do Not Disturb.
