import { useEffect, useState } from 'react'
import {
  AlarmClock,
  Building2,
  CheckCircle2,
  Download,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Share as ShareIcon,
  Smartphone,
  Sun,
  Upload,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { useToast } from '@/components/Toast/ToastProvider'
import { Spinner } from '@/components/ui/Skeleton'
import {
  bulkImportAttendance,
  friendlyError,
  getAttendanceRange,
} from '@/services/attendance'
import { ATTENDANCE_IMPORT } from '@/data/attendanceImport'
import { buildCsv, downloadBlob } from '@/utils/report'
import { buildDayInfos, computeStats, toHolidayMap } from '@/utils/attendance'
import { getHolidays } from '@/services/attendance'
import { eachDateKey, todayKey } from '@/utils/date'
import {
  getLateCutoff,
  getReminderTime,
  getShiftAlarm,
  setLateCutoff,
  setReminderTime,
  setShiftAlarm,
} from '@/utils/reminder'
import { playChime, primeAudio } from '@/utils/chime'
import {
  pushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/services/push'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useTheme } from '@/contexts/ThemeContext'
import type { Theme } from '@/utils/theme'

const DAYS = [
  { dow: 1, label: 'Monday' },
  { dow: 2, label: 'Tuesday' },
  { dow: 3, label: 'Wednesday' },
  { dow: 4, label: 'Thursday' },
  { dow: 5, label: 'Friday' },
  { dow: 6, label: 'Saturday' },
  { dow: 0, label: 'Sunday' },
]

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export function Settings() {
  const { user, signOut } = useAuth()
  const { profile, workingDays, save, refresh } = useProfile()
  const toast = useToast()
  const install = useInstallPrompt()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [days, setDays] = useState<number[]>(workingDays)
  const [officeName, setOfficeName] = useState('')
  const [officeLocation, setOfficeLocation] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingDays, setSavingDays] = useState(false)
  const [savingOffice, setSavingOffice] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  // Reminders
  const [reminderTime, setReminderTimeState] = useState(getReminderTime())
  const [lateCutoff, setLateCutoffState] = useState(getLateCutoff())
  const [shiftAlarm, setShiftAlarmState] = useState(getShiftAlarm())
  const [pushState, setPushState] = useState(pushPermission())
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setDesignation(profile.designation ?? '')
      setPhone(profile.phone ?? '')
      setDob(profile.date_of_birth ?? '')
      setDays(workingDays)
      setOfficeName(profile.office_name ?? '')
      setOfficeLocation(profile.office_location ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await save({
        name: name.trim() || null,
        designation: designation.trim() || null,
        phone: phone.trim() || null,
        date_of_birth: dob || null,
      })
      toast.success('Profile updated.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setSavingProfile(false)
    }
  }

  const toggleDay = (dow: number) =>
    setDays((d) => (d.includes(dow) ? d.filter((x) => x !== dow) : [...d, dow].sort()))

  const saveDays = async () => {
    setSavingDays(true)
    try {
      await save({ working_days: days })
      toast.success('Working days updated.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setSavingDays(false)
    }
  }

  const saveOffice = async () => {
    setSavingOffice(true)
    try {
      await save({
        office_name: officeName.trim() || null,
        office_location: officeLocation.trim() || null,
      })
      toast.success('Office details saved.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setSavingOffice(false)
    }
  }

  const exportAll = async () => {
    if (!user) return
    setExporting(true)
    try {
      // Export the current calendar year up to today.
      const year = new Date().getFullYear()
      const start = `${year}-01-01`
      const end = todayKey()
      const [records, holidays] = await Promise.all([
        getAttendanceRange(user.id, start, end),
        getHolidays(start, end),
      ])
      const recMap = new Map(records.map((r) => [r.attendance_date, r]))
      const holidayMap = toHolidayMap(holidays)
      const stats = computeStats(
        start,
        end,
        recMap,
        new Set(holidayMap.keys()),
        days
      )
      const dayInfos = buildDayInfos(
        eachDateKey(start, end),
        recMap,
        holidayMap,
        days
      ).filter((d) => !d.isFuture)
      const csv = buildCsv({
        from: start,
        to: end,
        days: dayInfos,
        stats,
        personName: name || user.email || 'User',
      })
      downloadBlob(
        new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
        `attendance_${year}.csv`
      )
      toast.success('Attendance exported.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setExporting(false)
    }
  }

  const importHistory = async () => {
    if (!user) return
    setImporting(true)
    try {
      const count = await bulkImportAttendance(user.id, ATTENDANCE_IMPORT)
      if (count > 0) {
        toast.success(
          `Imported ${count} day${count === 1 ? '' : 's'}. Open Home or Calendar to see them.`
        )
      } else {
        toast.info('Already up to date — nothing new to import.')
      }
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setImporting(false)
    }
  }

  const changeReminderTime = (t: string) => {
    setReminderTimeState(t)
    setReminderTime(t)
  }

  const changeLateCutoff = (t: string) => {
    setLateCutoffState(t)
    setLateCutoff(t)
  }

  const toggleShiftAlarm = (on: boolean) => {
    setShiftAlarmState(on)
    setShiftAlarm(on)
    if (on) {
      primeAudio()
      playChime()
    }
  }

  const testChime = () => {
    primeAudio()
    playChime()
  }

  const enablePush = async () => {
    if (!user) return
    setPushBusy(true)
    try {
      const res = await subscribeToPush(user.id)
      setPushState(pushPermission())
      if (res.ok) toast.success('Closed-app notifications enabled.')
      else toast.error(res.reason ?? 'Could not enable notifications.')
    } finally {
      setPushBusy(false)
    }
  }

  const disablePush = async () => {
    if (!user) return
    setPushBusy(true)
    try {
      await unsubscribeFromPush(user.id)
      setPushState(pushPermission())
      toast.info('Closed-app notifications turned off on this device.')
    } finally {
      setPushBusy(false)
    }
  }

  const sync = async () => {
    setSyncing(true)
    try {
      await refresh()
      toast.success('Data synced.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile and preferences.
        </p>
      </header>

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <p className="label">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['light', 'Light', Sun],
              ['dark', 'Dark', Moon],
              ['system', 'System', Monitor],
            ] as [Theme, string, typeof Sun][]
          ).map(([value, labelText, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition ${
                theme === value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              {labelText}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          System follows your device&apos;s light/dark setting.
        </p>
      </Section>

      {/* Install app */}
      <Section icon={Smartphone} title="Install app">
        {install.installed ? (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Installed — you&apos;re running the app version.
          </div>
        ) : install.canInstall ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Add Attendance to your home screen for a full-screen, native-like
              experience — and it opens offline.
            </p>
            <button className="btn-primary" onClick={() => void install.promptInstall()}>
              <Smartphone className="h-4 w-4" />
              Install app
            </button>
          </div>
        ) : install.ios ? (
          <div className="space-y-2 text-sm text-slate-500">
            <p>To install on iPhone/iPad:</p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                Tap the <ShareIcon className="inline h-3.5 w-3.5" /> Share button in
                Safari.
              </li>
              <li>Choose “Add to Home Screen”.</li>
            </ol>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Open this site in Chrome, Edge or Safari and use the browser’s “Install”
            / “Add to Home Screen” option to install it as an app.
          </p>
        )}
      </Section>

      {/* Profile */}
      <Section icon={UserIcon} title="Profile">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="label" htmlFor="designation">Designation</label>
            <input
              id="designation"
              className="input"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>
          <div>
            <label className="label" htmlFor="dob">Date of birth</label>
            <input
              id="dob"
              type="date"
              className="input sm:w-56"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 98765 43210"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50 text-slate-500" value={user?.email ?? ''} disabled />
            <p className="mt-1 text-xs text-slate-400">
              Email comes from your account and can&apos;t be changed here.
            </p>
          </div>
          <button className="btn-primary" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Save Profile
          </button>
        </div>
      </Section>

      {/* Working days */}
      <Section icon={Building2} title="Attendance">
        <p className="label">Working Days</p>
        <div className="space-y-2">
          {DAYS.map(({ dow, label }) => (
            <label
              key={dow}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-white/60 px-4 py-2.5"
            >
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <input
                type="checkbox"
                checked={days.includes(dow)}
                onChange={() => toggleDay(dow)}
                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
            </label>
          ))}
        </div>
        <button className="btn-primary mt-4" onClick={saveDays} disabled={savingDays}>
          {savingDays ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          Save Working Days
        </button>
      </Section>

      {/* Office */}
      <Section icon={Building2} title="Office">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="office-name">Office Name</label>
            <input
              id="office-name"
              className="input"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              placeholder="e.g. Head Office"
            />
          </div>
          <div>
            <label className="label" htmlFor="office-loc">Office Location</label>
            <input
              id="office-loc"
              className="input"
              value={officeLocation}
              onChange={(e) => setOfficeLocation(e.target.value)}
              placeholder="e.g. Bengaluru"
            />
          </div>
          <p className="text-xs text-slate-400">
            Informational only — no location tracking is performed.
          </p>
          <button className="btn-primary" onClick={saveOffice} disabled={savingOffice}>
            {savingOffice ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Save Office
          </button>
        </div>
      </Section>

      {/* Reminders */}
      <Section icon={AlarmClock} title="Reminders">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="reminder-time">Reminder time</label>
            <input
              id="reminder-time"
              type="time"
              className="input sm:w-44"
              value={reminderTime}
              onChange={(e) => changeReminderTime(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              After this time on a working day, the Home page shows a nudge if you
              haven&apos;t punched in yet.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="late-cutoff">Late cut‑off</label>
            <input
              id="late-cutoff"
              type="time"
              className="input sm:w-44"
              value={lateCutoff}
              onChange={(e) => changeLateCutoff(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              If you haven&apos;t punched in by this time, a “You&apos;re late”
              popup asks you to mark Present — otherwise the day is counted Absent.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold text-slate-700">
                  8‑hour completion sound
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  Play a chime when 8 hours from your punch‑in are complete
                  (only while the app is open).
                </span>
              </span>
              <input
                type="checkbox"
                checked={shiftAlarm}
                onChange={(e) => toggleShiftAlarm(e.target.checked)}
                className="h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
            </label>
            <button className="btn-secondary mt-3" onClick={testChime} type="button">
              <AlarmClock className="h-4 w-4" />
              Test sound
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700">
              Notify me even when the app is closed
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Sends a push notification at the 8‑hour mark. Needs the one‑time
              server setup (see PUSH_SETUP.md) and, on iPhone, installing the app
              to your home screen.
            </p>
            {pushState === 'unsupported' ? (
              <p className="mt-2 text-xs text-slate-400">
                Not supported on this browser.
              </p>
            ) : pushState === 'denied' ? (
              <p className="mt-2 text-xs text-amber-600">
                Notifications are blocked in your browser settings — re‑enable
                them there, then reload.
              </p>
            ) : pushState === 'granted' ? (
              <button
                className="btn-secondary mt-3"
                onClick={() => void disablePush()}
                disabled={pushBusy}
                type="button"
              >
                {pushBusy ? <Spinner className="h-4 w-4" /> : null}
                Turn off on this device
              </button>
            ) : (
              <button
                className="btn-primary mt-3"
                onClick={() => void enablePush()}
                disabled={pushBusy}
                type="button"
              >
                {pushBusy ? <Spinner className="h-4 w-4" /> : <AlarmClock className="h-4 w-4" />}
                Enable closed‑app notifications
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* Data */}
      <Section icon={Download} title="Data">
        <div className="space-y-2">
          <button
            className="btn-secondary w-full justify-start"
            onClick={importHistory}
            disabled={importing}
          >
            {importing ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            Import Attendance History
          </button>
          <button className="btn-secondary w-full justify-start" onClick={exportAll} disabled={exporting}>
            {exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            Export Attendance ({new Date().getFullYear()})
          </button>
          <button className="btn-secondary w-full justify-start" onClick={sync} disabled={syncing}>
            {syncing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            Sync Data
          </button>
          <button
            className="btn w-full justify-start text-red-600 hover:bg-red-50"
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </Section>
    </div>
  )
}
