import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from '@/lib/supabase'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { ToastProvider } from '@/components/Toast/ToastProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConfigNeeded } from '@/pages/ConfigNeeded'
import { Login } from '@/pages/Login/Login'
import { Home } from '@/pages/Home/Home'
import { CalendarPage } from '@/pages/Calendar/Calendar'
import { Tasks } from '@/pages/Tasks/Tasks'
import { Reports } from '@/pages/Reports/Reports'
import { Settings } from '@/pages/Settings/Settings'

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigNeeded />
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <ProfileProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </BrowserRouter>
        </ProfileProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
