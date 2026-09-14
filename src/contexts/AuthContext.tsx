import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AUTHORIZED_EMAIL, isSupabaseConfigured, supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** True when the given email matches the single authorized account. */
function isAuthorized(email: string | undefined | null): boolean {
  if (!AUTHORIZED_EMAIL) return true // no restriction configured
  return (email ?? '').trim().toLowerCase() === AUTHORIZED_EMAIL
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(async (next: Session | null) => {
    // Enforce single-user restriction: reject & sign out any other account.
    if (next && !isAuthorized(next.user.email)) {
      await supabase.auth.signOut()
      setSession(null)
      throw new Error('This account is not authorized to use this app.')
    }
    setSession(next)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let active = true

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return
        try {
          await applySession(data.session)
        } catch {
          if (active) setSession(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      // Guard the async work but keep the callback sync.
      void (async () => {
        try {
          await applySession(next)
        } catch {
          if (active) setSession(null)
        }
      })()
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. See .env.example.')
      }
      const normalized = email.trim().toLowerCase()
      if (!isAuthorized(normalized)) {
        throw new Error('This account is not authorized to use this app.')
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      })
      if (error) throw error
      await applySession(data.session)
    },
    [applySession]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signOut,
    }),
    [session, loading, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
