import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Profile } from '@/types'
import { ensureProfile, updateProfile } from '@/services/attendance'
import { useAuth } from './AuthContext'
import { workingDaysOf } from '@/utils/attendance'

interface ProfileContextValue {
  profile: Profile | null
  workingDays: number[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  save: (
    patch: Partial<
      Pick<
        Profile,
        | 'name'
        | 'designation'
        | 'phone'
        | 'date_of_birth'
        | 'working_days'
        | 'office_name'
        | 'office_location'
      >
    >
  ) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const p = await ensureProfile(user.id, user.email ?? null)
      setProfile(p)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = useCallback<ProfileContextValue['save']>(
    async (patch) => {
      if (!user) throw new Error('Not signed in.')
      const updated = await updateProfile(user.id, patch)
      setProfile(updated)
    },
    [user]
  )

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      workingDays: workingDaysOf(profile),
      loading,
      error,
      refresh,
      save,
    }),
    [profile, loading, error, refresh, save]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
