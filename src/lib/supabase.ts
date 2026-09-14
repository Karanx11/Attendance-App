import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * The email of the single authorized user. Any other account that
 * authenticates is signed out immediately (see AuthContext).
 */
export const AUTHORIZED_EMAIL = (
  import.meta.env.VITE_AUTHORIZED_EMAIL as string | undefined
)
  ?.trim()
  .toLowerCase()

/**
 * True only when the required Supabase env vars are present. When false the
 * app shows a clear configuration screen instead of crashing.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

// Create the client even if env is missing, using harmless placeholders, so
// imports never throw. `isSupabaseConfigured` gates all real usage.
export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'attendance-auth',
    },
  }
)
