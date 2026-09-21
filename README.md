# Attendance — Personal Attendance Tracker

A private, single‑user **web app** for tracking your own work attendance: punch
in / punch out, mark WFH or Leave, plan and review it on a calendar, keep a
to‑do list, and export polished reports. It’s fully responsive — a fixed
sidebar on desktop and a native‑feeling bottom navigation on mobile — installs
as an app (PWA), works offline, supports light/dark themes, and can remind you
to punch in.

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
- **Validations**: can’t punch out before punching in, can’t punch in/out
  twice, one record per day (enforced by a DB unique constraint *and* the UI),
  Leave clears punch times, future dates can’t be punched in.
- **Refresh‑safe** — today’s state is always loaded from Supabase, so a reload
  or re‑login never loses data.

### Calendar & overview

- **Month calendar** colour‑coded: Present (green), WFH (brown), Leave (maroon),
  Weekend / Holiday (red), Absent (amber), Upcoming (grey). Tap any day for a
  details popup where you can view, edit, mark leave, or clear it.
- **Year heatmap** — a GitHub‑style grid of the whole year at a glance, below
  the calendar; click any cell to jump to that day.
- **Joining date** is highlighted with a star and never counts earlier days as
  absent.

### Insights

- **Monthly stats**: Present, WFH, Leave, Absent, Attendance %, average punch
  in / out, and average working hours.
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

### Reminders

- **Home nudge** if it’s a working day past your reminder time (set in Settings)
  and you haven’t punched in yet. It’s an in‑app banner — no browser
  notifications or push.

### Experience

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
   `profiles`, `attendance`, `tasks`, and `holidays` tables, enables RLS with
   the correct policies, adds triggers, seeds Indian public holidays, and
   auto‑creates a profile row for new users.
3. Create **your** user under **Authentication → Users → Add user** (email +
   password, mark it confirmed). This is the only account that will be allowed
   in — there is intentionally **no public signup**.
4. Copy the **Project URL** and **anon public key** from
   **Project Settings → API** into your `.env` (next section).

> ⚠️ Only ever use the **anon** key in the frontend — never the `service_role`
> key. Row Level Security is what keeps your data private.

Optional SQL you can run later:

- [`supabase/seed_attendance.sql`](supabase/seed_attendance.sql) — example of
  bulk‑loading historical attendance via SQL.
- [`supabase/migration_tasks.sql`](supabase/migration_tasks.sql) — the tasks
  table (already included in `schema.sql` for fresh setups; run it individually
  only if you added tasks to an existing database).

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_AUTHORIZED_EMAIL=you@example.com     # must match the user you created
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

> The PWA (install + offline) is active in the **production build**, not in
> `npm run dev`.

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
already have.

### Install as an app (PWA)

Open the deployed site (HTTPS) and use the browser’s **Install** / **Add to Home
Screen** option, or **Settings → Install app**. On iPhone, installing to the
Home Screen enables standalone mode (iOS 16.4+).

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
├── supabase/
│   ├── schema.sql             # tables, RLS, triggers, holiday seed (run this)
│   ├── migration_tasks.sql    # tasks table (also in schema.sql)
│   └── seed_attendance.sql    # example bulk import via SQL
├── scripts/
│   └── gen-icons.mjs          # generates PWA icons into public/
└── src/
    ├── components/
    │   ├── AttendanceCard/    # punch in/out, WFH toggle, 8-hour hint
    │   ├── AttendanceCalendar/# month grid
    │   ├── YearHeatmap/       # GitHub-style year grid
    │   ├── DateDetails/       # per-day popup (view + edit)
    │   ├── LeaveModal/        # mark-leave form
    │   ├── ShareReport/       # Excel / PDF / CSV / Print / Share
    │   ├── StatCard/          # stat tile
    │   ├── Sidebar/ BottomNav/# desktop + mobile navigation
    │   ├── ImportBanner/ PunchReminder/
    │   ├── Toast/             # toast notifications
    │   ├── ProtectedRoute.tsx
    │   ├── layout/ nav/ ui/   # AppLayout, nav config, Dialog + Skeleton
    ├── contexts/              # Auth, Profile, Theme
    ├── hooks/                 # useRangeData, useInstallPrompt
    ├── services/              # Supabase access: attendance, tasks
    ├── data/                  # bundled attendance import
    ├── lib/                   # Supabase client
    ├── pages/                 # Login, Home, Calendar, Tasks, Reports, Settings, ConfigNeeded
    ├── utils/                 # date, attendance logic, status colours, report gen,
    │                          #   reminder, theme, config (joining date)
    ├── sw.ts                  # custom service worker (offline caching)
    ├── App.tsx  main.tsx  index.css  types/
```

---

## Database schema

Four tables, all with Row Level Security. Holidays are readable by any
authenticated user; everything else is scoped to `auth.uid()`.

| Table        | Purpose                                    | Access (RLS)                            |
| ------------ | ------------------------------------------ | --------------------------------------- |
| `profiles`   | name, email, working days, office info     | own row only (select / insert / update) |
| `attendance` | one row per day: status, punch times, etc. | own rows, full CRUD                     |
| `tasks`      | to‑do items with dates & completion        | own rows, full CRUD                     |
| `holidays`   | public holidays (managed via SQL)          | readable by any authenticated user      |

`attendance` has a `UNIQUE(user_id, attendance_date)` constraint so there can
never be two records for the same day. All timestamps are `TIMESTAMPTZ` (UTC)
and displayed in your local timezone.

---

## How the logic works

- **Working time** = punch‑out minus punch‑in, in whole minutes, from the raw
  timestamps.
- **Attendance %** = `(Present + WFH + Leave) ÷ working days elapsed`.
- **Absent** = a past working day (per your working‑days setting) that is not a
  weekend, holiday, future date, or before your joining date, and has no record.
- **Day colour precedence**: an actual record (Present / WFH / Leave) always
  wins over weekend / holiday colouring.
- **Timezones**: “which day” is computed from your local calendar date, so a
  late‑night punch never lands on the wrong day; stored timestamps stay UTC.

The core rules live in [`src/utils/attendance.ts`](src/utils/attendance.ts) and
[`src/utils/date.ts`](src/utils/date.ts), independent of the UI.

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

| Variable                 | Required | Purpose                           |
| ------------------------ | -------- | --------------------------------- |
| `VITE_SUPABASE_URL`      | yes      | Supabase project URL              |
| `VITE_SUPABASE_ANON_KEY` | yes      | Supabase anon public key          |
| `VITE_AUTHORIZED_EMAIL`  | yes      | The only email allowed to sign in |

**In‑app settings** (persisted): name, working days (default Mon–Fri), office
name/location (informational), theme, and reminder time.

**Code constants**: `JOINING_DATE` in
[`src/utils/config.ts`](src/utils/config.ts); the standard workday length (8h)
in [`src/components/AttendanceCard/AttendanceCard.tsx`](src/components/AttendanceCard/AttendanceCard.tsx).

---

## Security

- **Auth + RLS everywhere** — the app never trusts the client for access; every
  query is scoped to `auth.uid()` by Postgres policies.
- **Single authorized user** — enforced both in the UI (any other account is
  signed out) and by RLS on the data.
- **No secrets in the frontend** — only the anon key ships to the browser; the
  `service_role` key is never used client‑side.
- `.env` and build artifacts are git‑ignored.

---

## Roadmap

Ideas not yet built, roughly by value:

- Analytics page with charts (attendance %, hours/week, punch‑in trend)
- Leave‑balance tracking (annual quota per type)
- Configurable work hours + late‑arrival / early‑leave flags
- Weekly summary card on Home
- Manage holidays in‑app; make the joining date a setting
- Overtime tracking; `.ics` export of leave; app lock (PIN/biometric)

---

## License

Personal project — use it for yourself. No warranty.
