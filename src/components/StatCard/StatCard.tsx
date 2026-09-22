import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  /** Tailwind text/bg accent, e.g. 'text-green-600' */
  accent?: string
  iconBg?: string
  sub?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'text-brand-600',
  iconBg = 'bg-brand-50',
  sub,
}: StatCardProps) {
  return (
    <div className="glass-card-soft flex items-center gap-3 p-4">
      {Icon && (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
      )}
      <div className="min-w-0">
        <p className="break-words text-[11px] font-semibold uppercase leading-tight tracking-normal text-slate-500">
          {label}
        </p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}
