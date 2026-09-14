import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Optional footer (actions). */
  footer?: ReactNode
}

/**
 * Responsive dialog: a centered modal on desktop, a bottom sheet on mobile.
 * Closes on backdrop click and Escape.
 */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/60 bg-white/95 shadow-glass backdrop-blur-xl animate-sheet-up
                   sm:max-w-md sm:rounded-3xl sm:animate-scale-in"
      >
        {/* Grab handle on mobile */}
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        {title && (
          <div className="flex items-center justify-between px-5 pb-2 pt-3 sm:pt-5">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-2">{children}</div>

        {footer && (
          <div
            className="border-t border-slate-100 px-5 pt-4"
            style={{
              paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
            }}
          >
            {footer}
          </div>
        )}
        {!footer && (
          <div
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}
          />
        )}
      </div>
    </div>
  )
}
