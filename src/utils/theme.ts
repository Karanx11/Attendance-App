export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const KEY = 'theme'

export function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark' || t === 'system') return t
  } catch {
    /* ignore */
  }
  return 'system'
}

export function storeTheme(t: Theme): void {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* ignore */
  }
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

export function resolveTheme(t: Theme): ResolvedTheme {
  return t === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : t
}

/** Apply the effective theme to <html> (class, color-scheme, browser chrome). */
export function applyTheme(t: Theme): void {
  const eff = resolveTheme(t)
  const root = document.documentElement
  root.classList.toggle('dark', eff === 'dark')
  root.style.colorScheme = eff
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', eff === 'dark' ? '#0b1220' : '#eff6ff')
}
