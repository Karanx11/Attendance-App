import {
  Home,
  Calendar,
  BarChart3,
  ListTodo,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]
