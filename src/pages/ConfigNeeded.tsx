import { AlertTriangle } from 'lucide-react'

export function ConfigNeeded() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-lg p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Setup required</h1>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Supabase environment variables are missing. Create a{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-brand-700">.env</code>{' '}
          file in the project root (copy{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-brand-700">
            .env.example
          </code>
          ) and set:
        </p>
        <pre className="mb-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          {`VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AUTHORIZED_EMAIL=you@example.com`}
        </pre>
        <ol className="ml-4 list-decimal space-y-1.5 text-sm text-slate-600">
          <li>Create a project at supabase.com.</li>
          <li>
            Run <code className="text-brand-700">supabase/schema.sql</code> in the SQL
            Editor.
          </li>
          <li>
            Add your user under Authentication → Users, then set{' '}
            <code className="text-brand-700">VITE_AUTHORIZED_EMAIL</code> to that email.
          </li>
          <li>Copy the URL and anon key from Project Settings → API.</li>
          <li>Restart the dev server.</li>
        </ol>
      </div>
    </div>
  )
}
