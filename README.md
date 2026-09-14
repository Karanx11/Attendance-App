# Attendance — Personal Attendance Tracker

A private, single-user attendance-tracking **website**. Punch in / punch out,
mark WFH or Leave, view a colour-coded calendar, monthly statistics, and export
or share reports. Built with **React + TypeScript + Vite + Supabase + Tailwind**.

Fully responsive: a fixed left sidebar on desktop and a fixed bottom navigation
on mobile, so it feels like a native app on a phone.

---

## Features

- 🔐 **Single-user auth** via Supabase (email + password, persistent session).
  Any account other than the authorized email is signed out automatically.
- ⏱️ **Manual punch in / punch out** with exact timestamps and live working-time.
- 🏢 **Office / WFH** toggle; 🛫 **Leave** (Casual / Sick / Personal / Other).
- 🗓️ **Calendar** colour-coded: Present (green), WFH (blue), Leave (maroon),
  weekend/holiday (red), absent (amber), upcoming (grey).
- 📊 **Statistics** — present, WFH, leave, absent, attendance %, average punch
  in/out and working hours. Absent is computed intelligently (past working days
  with no record; weekends, holidays and future days are excluded).
- 📄 **Reports** — current month / previous month / custom range, with a table
  and summary.
- 📤 **Share / Export** — Excel, PDF, CSV, Print, and the Web Share API on mobile.
- ✅ **Tasks** — a separate to-do page with dates, completion dates, and editing.
- ⏰ **Reminders** — a Home nudge and optional browser notification if you
  haven't punched in by your reminder time on a working day.
- 📲 **Installable (PWA)** — add to your home screen for a full-screen, native-like
  app that opens offline and shows your last-loaded data.
- 🎨 Modern glassmorphism UI, blue + white theme, no clutter.
- 🔒 Data isolated per user with **Row Level Security**.

No GPS, geofencing, location tracking, or automatic office detection —
attendance is entirely manual, exactly as intended.

> **Installing the app:** the PWA (install + offline) is active in the
> production build. Run `npm run build && npm run preview` locally, or deploy it,
> then use your browser's "Install" / "Add to Home Screen" option (also under
> Settings → Install app). It is intentionally off during `npm run dev`.

---

## 1. Prerequisites

- Node.js 18+ (tested on Node 24)
- A free [Supabase](https://supabase.com) project

## 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the
   `profiles`, `attendance`, and `holidays` tables, enables RLS with the correct
   policies, adds triggers, and seeds Indian public holidays for 2025–2026.
3. Create your user under **Authentication → Users → Add user** (enter your
   email + a password, and mark it confirmed). This is the only account that
   will be allowed in — there is intentionally **no public signup**.
   - _(Optional)_ To load existing history, run
     [`supabase/seed_attendance.sql`](supabase/seed_attendance.sql) in the SQL
     Editor after this step. It upserts imported attendance for the email in
     the file (change it if yours differs) and is safe to re-run.
4. Copy your **Project URL** and **anon public key** from
   **Project Settings → API**.

> ⚠️ Never use the `service_role` key in this app — only the `anon` key. RLS is
> what keeps your data private.

## 3. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_AUTHORIZED_EMAIL=you@example.com   # must match the user you created
```

`.env` is git-ignored and never committed.

## 4. Run

```bash
npm install
npm run dev        # http://localhost:5173
```

## 5. Build for production

```bash
npm run build      # type-checks then builds to dist/
npm run preview    # preview the production build
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare
Pages, etc.). Set the same `VITE_*` environment variables in the host.

---

## Project structure

```
src/
├── components/
│   ├── AttendanceCard/      Punch in/out, WFH toggle, live timer
│   ├── AttendanceCalendar/  Colour-coded month grid
│   ├── BottomNav/           Fixed mobile navigation
│   ├── DateDetails/         Modal (desktop) / bottom-sheet (mobile)
│   ├── LeaveModal/          Mark-leave form
│   ├── ShareReport/         PDF / CSV / Print / Share
│   ├── Sidebar/             Fixed desktop sidebar
│   ├── StatCard/            Statistic tile
│   ├── Toast/               Toast notifications
│   ├── layout/ nav/ ui/     Layout, nav config, primitives (Dialog, Skeleton)
│   └── ProtectedRoute.tsx
├── contexts/                AuthContext, ProfileContext
├── hooks/                   useRangeData (fetch + derive stats)
├── lib/                     Supabase client
├── pages/                   Login, Home, Calendar, Reports, Settings
├── services/                Supabase data access (attendance, profile, reports)
├── types/                   Shared TypeScript types
├── utils/                   date, attendance logic, status colours, report gen
└── App.tsx
```

## Notes on the rules implemented

- Timestamps are stored as `TIMESTAMPTZ` (UTC) and displayed in local time.
- Working duration is always computed from timestamps, never entered manually.
- Cannot punch out before punching in, cannot punch in/out twice, one record
  per day (enforced by a DB unique constraint **and** UI checks).
- Leave clears punch times; WFH keeps them.
- Future dates cannot be punched in.
- Buttons disable while a request is in flight to prevent duplicate records.
- Refreshing the page reloads today's state from Supabase.
- Holidays live in the `holidays` table (editable via SQL/dashboard), never
  hard-coded in components.
