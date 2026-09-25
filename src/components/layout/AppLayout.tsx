import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../Sidebar/Sidebar'
import { BottomNav } from '../BottomNav/BottomNav'
import { OfflineBanner } from '../OfflineBanner/OfflineBanner'
import { useShiftAlarm } from '@/hooks/useShiftAlarm'
import { useAuth } from '@/contexts/AuthContext'
import { syncPushSubscription } from '@/services/push'

export function AppLayout() {
  const { user } = useAuth()
  useShiftAlarm()
  // Keep the push subscription fresh if the user already granted permission.
  useEffect(() => {
    if (user) void syncPushSubscription(user.id)
  }, [user])
  return (
    <div className="min-h-screen">
      <Sidebar />
      <BottomNav />
      {/* Content: offset for sidebar on desktop, padded above bottom nav on mobile */}
      <main className="lg:pl-64">
        <div className="sticky top-0 z-20 lg:pl-0">
          <OfflineBanner />
        </div>
        <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
