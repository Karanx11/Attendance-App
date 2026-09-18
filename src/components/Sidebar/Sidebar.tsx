import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarCheck, ChevronRight, LogOut } from 'lucide-react'
import { NAV_ITEMS } from '../nav/navItems'
import { ProfileDialog } from '../ProfileDialog/ProfileDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'

export function Sidebar() {
  const { signOut, user } = useAuth()
  const { profile } = useProfile()
  const [profileOpen, setProfileOpen] = useState(false)
  const name = profile?.name || user?.email?.split('@')[0] || 'User'

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/60 bg-white/60 px-4 py-6 backdrop-blur-xl lg:flex">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-glass-sm">
          <CalendarCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-extrabold tracking-tight text-slate-800">
            Attendance
          </p>
          <p className="text-xs text-slate-400">Personal tracker</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-glass-sm'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="mt-4 border-t border-slate-200/70 pt-4">
        <button
          onClick={() => setProfileOpen(true)}
          className="mb-2 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/70"
          aria-label="View profile"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-700">{name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </aside>
  )
}
