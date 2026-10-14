import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Cake,
  Camera,
  CalendarDays,
  MapPin,
  Phone,
  Settings as SettingsIcon,
  Star,
  Trash2,
} from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Avatar } from '../Avatar/Avatar'
import { Spinner } from '../ui/Skeleton'
import { useToast } from '../Toast/ToastProvider'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { JOINING_DATE } from '@/utils/config'
import { formatFullDate } from '@/utils/date'
import { fileToAvatarDataUrl } from '@/utils/image'

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
  const { profile, workingDays, save } = useProfile()
  const toast = useToast()

  const fileRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)

  const name = profile?.name || user?.email?.split('@')[0] || 'User'
  const office = [profile?.office_name, profile?.office_location]
    .filter(Boolean)
    .join(' · ')
  const memberSince = formatFullDate(JOINING_DATE)

  const onPickPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    void (async () => {
      setPhotoBusy(true)
      try {
        const dataUrl = await fileToAvatarDataUrl(file)
        await save({ avatar_url: dataUrl })
        toast.success('Profile photo updated.')
      } catch (err) {
        toast.error((err as Error).message || 'Could not update the photo.')
      } finally {
        setPhotoBusy(false)
      }
    })()
  }

  const removePhoto = () => {
    void (async () => {
      setPhotoBusy(true)
      try {
        await save({ avatar_url: null })
        toast.info('Profile photo removed.')
      } catch (err) {
        toast.error((err as Error).message || 'Could not remove the photo.')
      } finally {
        setPhotoBusy(false)
      }
    })()
  }

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
          <div className="relative shrink-0">
            <Avatar
              url={profile?.avatar_url}
              name={name}
              className="h-16 w-16"
              textClassName="text-xl"
            />
            {photoBusy && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Spinner className="h-5 w-5 text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              aria-label={profile?.avatar_url ? 'Change photo' : 'Add photo'}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-glass-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickPhoto}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-800">{name}</p>
            {profile?.designation && (
              <p className="truncate text-sm font-semibold text-brand-600">
                {profile.designation}
              </p>
            )}
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
            {profile?.avatar_url && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={photoBusy}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-500 transition hover:text-red-600 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove photo
              </button>
            )}
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
