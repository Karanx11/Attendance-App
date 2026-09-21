import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Cake,
  CalendarDays,
  MapPin,
  Phone,
  Settings as SettingsIcon,
  Star,
} from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { JOINING_DATE } from '@/utils/config'
import { formatFullDate } from '@/utils/date'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatWorkingDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) {
    return 'Monday – Friday'
  }
  if (sorted.length === 0) return '—'
  return sorted.map((d) => DAY_SHORT[d]).join(', ')
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export function ProfileDialog({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, workingDays } = useProfile()

  const name = profile?.name || user?.email?.split('@')[0] || 'User'
  const office = [profile?.office_name, profile?.office_location]
    .filter(Boolean)
    .join(' · ')
  const memberSince = formatFullDate(JOINING_DATE)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Profile"
      footer={
        <button
          className="btn-primary w-full"
          onClick={() => {
            onClose()
            navigate('/settings')
          }}
        >
          <SettingsIcon className="h-4 w-4" />
          Edit in Settings
        </button>
      }
    >
      <div className="pb-2">
        {/* Header */}
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-800">{name}</p>
            {profile?.designation && (
              <p className="truncate text-sm font-semibold text-brand-600">
                {profile.designation}
              </p>
            )}
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50/80 px-4">
          {profile?.date_of_birth && (
            <Row
              icon={Cake}
              label="Date of birth"
              value={formatFullDate(profile.date_of_birth)}
            />
          )}
          {profile?.phone && <Row icon={Phone} label="Phone" value={profile.phone} />}
          <Row icon={CalendarDays} label="Working days" value={formatWorkingDays(workingDays)} />
          {office && <Row icon={Briefcase} label="Office" value={office} />}
          {!office && profile?.office_location && (
            <Row icon={MapPin} label="Location" value={profile.office_location} />
          )}
          <Row icon={Star} label="Joining date" value={formatFullDate(JOINING_DATE)} />
          <Row icon={CalendarDays} label="Member since" value={memberSince} />
        </div>
      </div>
    </Dialog>
  )
}
