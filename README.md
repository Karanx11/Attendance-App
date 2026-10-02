# Attendance — Personal Attendance Tracker

A private, single‑user **web app** for tracking your own work attendance: punch
in / punch out, mark WFH or Leave, plan and review it on a calendar, keep a
to‑do list, track your leave balances, and export polished reports. It’s fully
responsive — a fixed sidebar on desktop and a native‑feeling bottom navigation
on mobile — installs as an app (PWA), works offline, supports light/dark themes,
reminds you to punch in, chimes when your 8 hours are done, and can even notify
you when the app is closed.

Built with **React · TypeScript · Vite · Supabase (Auth + Postgres + RLS) ·
Tailwind CSS · lucide‑react**.

> Attendance is **entirely manual** (Punch In / Punch Out buttons). There is no
> GPS, geofencing, location tracking, or automatic office detection by design.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Supabase setup (step by step)](#supabase-setup-step-by-step)
- [Environment variables](#environment-variables)
- [Run & build](#run--build)
- [Deploy (Vercel)](#deploy-vercel)
- [Optional features](#optional-features)
  - [Import existing history](#import-existing-history)
  - [Install as an app (PWA)](#install-as-an-app-pwa)
  - [Closed‑app notifications (push)](#closed-app-notifications-push)
  - [Joining date](#joining-date)
- [Project structure](#project-structure)
- [Database schema](#database-schema)
- [How the logic works](#how-the-logic-works)
- [Available scripts](#available-scripts)
- [Configuration reference](#configuration-reference)
- [Security](#security)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

### Attendance

- **Manual Punch In / Punch Out** with exact timestamps; working time is
  calculated from the timestamps, never entered by hand.
- **Office / WFH** mode toggle for the day; **Leave** with a type (Casual /
  Sick / Personal / Other) and optional notes.
- **Editable times** — tap the Punch In / Punch Out time on Home to correct it
  with a time picker; hours recalculate automatically.
- **8‑hour hint** — while you’re working, the card shows “you can leave after
  HH:MM” and switches to “8 hours complete” once you’ve done a full day (ticks
  live).
- **Locked after 2 days** — a day can be edited for 2 days, then becomes
  read‑only. Enforced in the UI *and* by a database trigger, so past punch
  times can’t be changed or back‑dated once the window passes (history import
  still works).
- **Validations**: can’t punch out before punching in, can’t punch in/out
  twice, one record per day (enforced by a DB unique constraint *and* the UI),
  Leave clears punch times, future dates can’t be punched in.
- **Refresh‑safe & offline‑aware** — today’s state always loads from Supabase;
  punches made offline are queued locally and synced automatically on
  reconnect.

### Calendar & overview

- **Month calendar** colour‑coded: Present (green), WFH (brown), Leave (maroon),
  Weekend / Holiday (red), Absent (amber), Upcoming (grey). Tap any day for a
  details popup where you can view, edit, mark leave, or clear it.
- **Year heatmap** — a GitHub‑style grid of the whole year at a glance, below
  the calendar; click any cell to jump to that day.
- **Joining date** is highlighted with a star and never counts earlier days as
  absent.

### Leave balances

- A **Balances** tab on the Calendar page (next to **Calendar**) shows, for the
  year: total leave taken and a card per type with **used / quota**, days
  remaining, and a progress bar (over‑quota highlighted).
- **Editable quotas** per type, inline, with a year switcher to review past
  years. Defaults: Casual 12, Sick 12, Personal 6, Other = no limit (tracked
  only). Quotas are stored per‑device.
- A compact **“Leave left this year”** card on Home links straight to Balances.

### Insights

- **Monthly stats**: Present, WFH, Leave, Absent, Attendance %, average punch
  in / out, and average working hours.
- **Working‑hours trend** — a line chart on Home of daily hours for the browsed
  month, with an 8‑hour goal line.
- **Smart Absent logic** — a day only counts as Absent if it’s a past working
  day with no record; weekends, holidays, future days, and days before your
  joining date are excluded.

### Reports & export

- **Reports** page with **Current month / Previous month / Custom range**
  filters, a table, and a summary.
- **Share / Export** to **Excel (.xlsx)**, **PDF**, **CSV**, **Print**, or the
  **Web Share API** on mobile — with a self‑contained custom date range. Every
  export includes **Date, Day, Month & Status** for every day (weekends and
  holidays included).

### Tasks

- A separate **Tasks** page: add tasks with a date, mark complete (with a
  chosen completion date), edit text/date, and delete.
- **Tap a task** to open a details popup (title, status, dates, notes) with
  quick Edit / Complete / Delete actions.
- Filter by All / Pending / Completed; Today and Overdue badges.

### Reminders & notifications

- **Punch‑in nudge** — an in‑app banner on Home if it’s a working day past your
  reminder time and you haven’t punched in yet.
- **“Running late?” popup** — if you haven’t punched in by your late cut‑off
  (default 09:30), a popup asks you to mark Present; otherwise the day counts
  Absent.
- **8‑hour completion chime** — plays in‑app (synthesized, no audio file) when 8
  hours from your punch‑in elapse. Toggle + “Test sound” in Settings.
- **Closed‑app push notification** *(optional, needs setup)* — with the one‑time
  setup in [`PUSH_SETUP.md`](PUSH_SETUP.md), a Supabase Edge Function pushes an
  “8 hours complete” notification even when the app is closed. See the
  [push section](#closed-app-notifications-push) for the caveats (it’s the OS
  notification sound, not a custom alarm, and iPhone needs the app installed).

### Experience

- **Profile** — a profile popup from the sidebar with name, designation, phone,
  date of birth, working days, office, and joining / member‑since dates;
  editable in Settings.
- **Installable PWA** — add to your home screen for a full‑screen, native‑like
  app that **opens offline** and shows your last‑loaded data.
- **Light / Dark / System** theme with no flash on load; persists across
  refreshes.
- Modern **glassmorphism** UI, warm brown + white (light) / black + brown (dark)
  theme, tuned for performance on mobile.
- **Single‑user by design** — only the authorized account can sign in; any
  other account is signed out immediately. Row Level Security keeps every row
  private to its owner.

---

## Tech stack

| Area        | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite 5                              |
| Styling     | Tailwind CSS, lucide‑react icons                          |
| Routing     | react‑router‑dom                                          |
| Backend     | Supabase — Auth, PostgreSQL, Row Level Security           |
| PWA         | vite‑plugin‑pwa + Workbox (custom service worker)         |
| Push        | Web Push API + a Supabase Edge Function (Deno, web‑push)  |
| Offline     | localStorage outbox queue with auto‑sync on reconnect     |
| Exports     | xlsx (SheetJS), jsPDF + jspdf‑autotable                   |

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure Supabase (see the next section), then create .env
cp .env.example .env      # fill in the values

# 3. Run
npm run dev               # http://localhost:5173
```

Until `.env` is set the app shows a clear **“Setup required”** screen instead of
crashing.

---

## Supabase setup (step by step)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the
   `profiles`, `attendance`, `tasks`, `holidays`, and `push_subscriptions`
   tables, enables RLS with the correct policies, adds triggers (including the
   2‑day edit lock), seeds Indian public holidays, and auto‑creates a profile
   row for new users.
3. Create **your** user under **Authentication → Users → Add user** (email +
   password, mark it confirmed). This is the only account that will be allowed
   in — there is intentionally **no public signup**.
4. Copy the **Project URL** and **anon public key** from
   **Project Settings → API** into your `.env` (next section).

> ⚠️ Only ever use the **anon** key in the frontend — never the `service_role`
> key. Row Level Security is what keeps your data private.

`schema.sql` already contains everything for a **fresh** database. For an
**existing** database, apply only the migrations you need:

| Migration | Adds |
| --------- | ---- |
| [`migration_profile_fields.sql`](supabase/migration_profile_fields.sql) | `designation`, `phone`, `date_of_birth` on `profiles` |
| [`migration_push.sql`](supabase/migration_push.sql) | `push_subscriptions` table + `attendance.shift_notified` (needed for closed‑app notifications) |
| [`migration_lock_edits.sql`](supabase/migration_lock_edits.sql) | the 2‑day edit‑lock trigger on `attendance` |
| [`migration_tasks.sql`](supabase/migration_tasks.sql) | the `tasks` table |
| [`seed_attendance.sql`](supabase/seed_attendance.sql) | example of bulk‑loading history via SQL |

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_AUTHORIZED_EMAIL=you@example.com     # must match the user you created

# Optional — only for closed-app push notifications (see PUSH_SETUP.md)
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

`.env` is git‑ignored and never committed. Set the same variables in your
hosting provider for production.

---

## Run & build

```bash
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # type-check (tsc -b) then build to dist/
npm run preview    # preview the production build (PWA/offline active here)
npm run typecheck  # type-check only
npm run lint       # lint
```

> The PWA (install + offline) and the service worker are active in the
> **production build**, not in `npm run dev`.

---

## Deploy (Vercel)

1. Push the repo to GitHub and import it in Vercel (framework preset: **Vite**).
2. Add the environment variables from above in the Vercel project settings.
3. Deploy. [`vercel.json`](vercel.json) already rewrites all client routes to
   `index.html`, so deep links like `/calendar` and `/settings` work on refresh.

Any static host works (Netlify, Cloudflare Pages, …) — just serve `dist/` over
HTTPS and provide the same SPA fallback + env vars.

---

## Optional features

### Import existing history

Open **Home** → the “Import your attendance history” banner (or **Settings →
Data → Import Attendance History**) writes the records in
[`src/data/attendanceImport.ts`](src/data/attendanceImport.ts) to Supabase
through your logged‑in session. It’s idempotent — it never overwrites a day you
already have, and it still works for past dates even with the edit lock on
(the lock blocks changes/deletes, not inserts).

### Install as an app (PWA)

Open the deployed site (HTTPS) and use the browser’s **Install** / **Add to Home
Screen** option, or **Settings → Install app**. On iPhone, installing to the
Home Screen enables standalone mode (iOS 16.4+).

### Closed‑app notifications (push)

The 8‑hour alert plays in‑app whenever a tab is open. To also get it when the
app is **fully closed**, follow the one‑time setup in
[`PUSH_SETUP.md`](PUSH_SETUP.md): generate VAPID keys, set
`VITE_VAPID_PUBLIC_KEY`, run `migration_push.sql`, deploy the
[`shift-notify`](supabase/functions/shift-notify/index.ts) Edge Function with
its secrets, schedule it (every ~5 min), then enable it in **Settings →
Reminders**. Caveats: it uses the device’s **notification sound** (not a custom
alarm, and it won’t sound in Silent / Do Not Disturb), and on **iPhone** the
app must be installed to the Home Screen.

### Joining date

Your joining date lives in
[`src/utils/config.ts`](src/utils/config.ts) as `JOINING_DATE`. Days before it
are shown grey (unmarked) and are never counted as Absent or as working days.
Update this constant to your own start date.

---

## Project structure

```
.
├── index.html                 # app shell, PWA meta, anti-flash theme + splash
├── vite.config.ts             # Vite + PWA (custom service worker) config
├── vercel.json                # SPA rewrite for client-side routing
├── PUSH_SETUP.md              # one-time setup for closed-app push notifications
├── supabase/
│   ├── schema.sql             # tables, RLS, triggers, holiday seed (run this)
│   ├── migration_profile_fields.sql  # designation / phone / date_of_birth
│   ├── migration_push.sql     # push_subscriptions + attendance.shift_notified
│   ├── migration_lock_edits.sql      # 2-day edit-lock trigger
│   ├── migration_tasks.sql    # tasks table (also in schema.sql)
│   ├── seed_attendance.sql    # example bulk import via SQL
│   └── functions/shift-notify # Edge Function that sends the 8h push
├── scripts/
│   └── gen-icons.mjs          # generates PWA icons into public/
└── src/
    ├── components/
    │   ├── AttendanceCard/    # punch in/out, WFH toggle, 8-hour hint
    │   ├── AttendanceCalendar/# month grid
    │   ├── YearHeatmap/       # GitHub-style year grid
    │   ├── MonthHoursChart/   # daily working-hours line chart (Home)
    │   ├── LeaveBalances/ LeaveSummary/   # Balances tab + Home summary
    │   ├── DateDetails/       # per-day popup (view + edit, lock-aware)
    │   ├── LeaveModal/        # mark-leave form
    │   ├── LatePunchDialog/   # "running late?" popup at the late cut-off
    │   ├── ProfileDialog/     # profile popup
    │   ├── ShareReport/       # Excel / PDF / CSV / Print / Share
    │   ├── StatCard/          # stat tile
    │   ├── Sidebar/ BottomNav/# desktop + mobile navigation
    │   ├── ImportBanner/ PunchReminder/ OfflineBanner/
    │   ├── Toast/             # toast notifications
    │   ├── ProtectedRoute.tsx
    │   └── layout/ nav/ ui/   # AppLayout, nav config, Dialog + Skeleton
    ├── contexts/              # Auth, Profile, Theme
    ├── hooks/                 # useRangeData, useAttendanceWrite, useShiftAlarm,
    │                          #   useOnlineStatus, useInstallPrompt
    ├── services/             # Supabase access: attendance, tasks, push, offlineQueue
    ├── data/                  # bundled attendance import
    ├── lib/                   # Supabase client
    ├── pages/                 # Login, Home, Calendar, Tasks, Reports, Settings, ConfigNeeded
    ├── utils/                 # date, attendance logic, status colours, report gen,
    │                          #   reminder, chime, editLock, leave, theme, config
    ├── sw.ts                  # custom service worker (offline caching + push)
    ├── App.tsx  main.tsx  index.css  types/
```

---

## Database schema

Five tables, all with Row Level Security. Holidays are readable by any
authenticated user; everything else is scoped to `auth.uid()`.

| Table                | Purpose                                                  | Access (RLS)                            |
| -------------------- | ------------------------------------------------------- | --------------------------------------- |
| `profiles`           | name, email, designation, phone, DOB, working days, office | own row only (select / insert / update) |
| `attendance`         | one row per day: status, punch times, `shift_notified`, etc. | own rows, full CRUD                 |
| `tasks`              | to‑do items with dates & completion                     | own rows, full CRUD                     |
| `holidays`           | public holidays (managed via SQL)                       | readable by any authenticated user      |
| `push_subscriptions` | one row per browser/device for web push                 | own rows, full CRUD                     |

`attendance` has a `UNIQUE(user_id, attendance_date)` constraint so there can
never be two records for the same day, plus a trigger that blocks
`UPDATE`/`DELETE` on rows older than 2 days (the edit lock). All timestamps are
`TIMESTAMPTZ` (UTC) and displayed in your local timezone.

---

## How the logic works

- **Working time** = punch‑out minus punch‑in, in whole minutes, from the raw
  timestamps.
- **Attendance %** = `(Present + WFH + Leave) ÷ working days elapsed`.
- **Absent** = a past working day (per your working‑days setting) that is not a
  weekend, holiday, future date, or before your joining date, and has no record.
- **Edit lock** = a day is editable for `EDIT_LOCK_DAYS` (2) days; after that the
  UI hides the edit actions and a DB trigger rejects changes/deletes. Inserts
  stay allowed so history back‑fill still works.
- **Day colour precedence**: an actual record (Present / WFH / Leave) always
  wins over weekend / holiday colouring.
- **Timezones**: “which day” is computed from your local calendar date, so a
  late‑night punch never lands on the wrong day; stored timestamps stay UTC.

The core rules live in [`src/utils/attendance.ts`](src/utils/attendance.ts),
[`src/utils/date.ts`](src/utils/date.ts), and
[`src/utils/editLock.ts`](src/utils/editLock.ts), independent of the UI.

---

## Available scripts

| Script              | Does                                              |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                         |
| `npm run build`     | Type‑check then build to `dist/`                  |
| `npm run preview`   | Serve the production build (PWA active)           |
| `npm run typecheck` | TypeScript check only                             |
| `npm run lint`      | Lint the project                                  |
| `node scripts/gen-icons.mjs` | Regenerate PWA icons into `public/`      |

---

## Configuration reference

**Environment (`.env`)**

| Variable                 | Required | Purpose                                    |
| ------------------------ | -------- | ------------------------------------------ |
| `VITE_SUPABASE_URL`      | yes      | Supabase project URL                       |
| `VITE_SUPABASE_ANON_KEY` | yes      | Supabase anon public key                   |
| `VITE_AUTHORIZED_EMAIL`  | yes      | The only email allowed to sign in          |
| `VITE_VAPID_PUBLIC_KEY`  | no       | Public VAPID key for closed‑app push       |

**In‑app settings** (persisted): name, designation, phone, date of birth,
working days (default Mon–Fri), office name/location, theme, reminder time, late
cut‑off, the 8‑hour completion sound, and closed‑app notifications.

**Stored per‑device (localStorage)**: theme, reminder/late‑cut‑off/alarm
preferences, and leave quotas.

**Code constants**: `JOINING_DATE` in
[`src/utils/config.ts`](src/utils/config.ts); `EDIT_LOCK_DAYS` and the shift
length (`SHIFT_MINUTES`) in [`src/utils/editLock.ts`](src/utils/editLock.ts) /
[`src/utils/reminder.ts`](src/utils/reminder.ts); default leave quotas in
[`src/utils/leave.ts`](src/utils/leave.ts).

---

## Security

- **Auth + RLS everywhere** — the app never trusts the client for access; every
  query is scoped to `auth.uid()` by Postgres policies.
- **Single authorized user** — enforced both in the UI (any other account is
  signed out) and by RLS on the data.
- **No secrets in the frontend** — only the anon key (and the public VAPID key)
  ship to the browser; the `service_role` and VAPID **private** keys live only
  in the Edge Function’s secrets.
- **Immutable history** — the edit‑lock trigger keeps attendance older than 2
  days from being changed or back‑dated, even via the API.
- `.env` and build artifacts are git‑ignored.

---

## Roadmap

Ideas not yet built, roughly by value:

- Half‑day / partial leave, and break (lunch) tracking for accurate net hours
- Forgot‑to‑punch‑out recovery (prompt to set the out‑time next day)
- Sync leave quotas across devices (store in the profile instead of localStorage)
- Manage holidays in‑app; make the joining date a setting
- Overtime tracking; `.ics` / calendar export of leave; app lock (PIN/biometric)
- Deeper analytics (punctuality score, streaks, punch‑in trend)

---


