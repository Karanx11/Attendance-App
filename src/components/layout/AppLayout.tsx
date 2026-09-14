import { Outlet } from 'react-router-dom'
import { Sidebar } from '../Sidebar/Sidebar'
import { BottomNav } from '../BottomNav/BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <BottomNav />
      {/* Content: offset for sidebar on desktop, padded above bottom nav on mobile */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
