import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Task } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/Toast/ToastProvider'
import { StatCard } from '@/components/StatCard/StatCard'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton, Spinner } from '@/components/ui/Skeleton'
import {
  addTask,
  deleteTask,
  getTasks,
  toggleTask,
  updateTask,
} from '@/services/tasks'
import { friendlyError } from '@/services/attendance'
import {
  combineDateTime,
  formatFullDate,
  isPastKey,
  isTodayKey,
  toDateKey,
  todayKey,
} from '@/utils/date'

type Filter = 'all' | 'pending' | 'completed'

export function Tasks() {
  const { user } = useAuth()
  const toast = useToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  // New-task form
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey())
  const [adding, setAdding] = useState(false)
  // Per-row busy state (toggle / delete)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Completion-date picker popup
  const [completeFor, setCompleteFor] = useState<Task | null>(null)
  const [completeDate, setCompleteDate] = useState(todayKey())
  const [savingComplete, setSavingComplete] = useState(false)
  // Edit-task popup
  const [editFor, setEditFor] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState(todayKey())
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      setTasks(await getTasks(user.id))
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    const t = title.trim()
    if (!t) {
      toast.info('Enter a task first.')
      return
    }
    setAdding(true)
    try {
      const created = await addTask(user.id, date, t)
      setTasks((prev) => [...prev, created])
      setTitle('')
      toast.success('Task added.')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setAdding(false)
    }
  }

  // Tapping the check: completing opens a date picker; un-completing is instant.
  const handleToggle = (task: Task) => {
    if (task.completed) {
      void reopenTask(task)
    } else {
      setCompleteDate(todayKey())
      setCompleteFor(task)
    }
  }

  const reopenTask = async (task: Task) => {
    if (!user) return
    setBusyId(task.id)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: false, completed_at: null } : t
      )
    )
    try {
      await toggleTask(user.id, task.id, false)
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      toast.error(friendlyError(e))
    } finally {
      setBusyId(null)
    }
  }

  const confirmComplete = async () => {
    if (!user || !completeFor) return
    setSavingComplete(true)
    // Store the picked date at local noon so the day never shifts across timezones.
    const completedAt = combineDateTime(completeDate, '12:00')
    try {
      const updated = await toggleTask(user.id, completeFor.id, true, completedAt)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setCompleteFor(null)
      toast.success('Task completed.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setSavingComplete(false)
    }
  }

  const openEdit = (task: Task) => {
    setEditTitle(task.title)
    setEditDate(task.task_date)
    setEditFor(task)
  }

  const confirmEdit = async () => {
    if (!user || !editFor) return
    const title = editTitle.trim()
    if (!title) {
      toast.info('Task cannot be empty.')
      return
    }
    setSavingEdit(true)
    try {
      const updated = await updateTask(user.id, editFor.id, {
        title,
        task_date: editDate,
      })
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setEditFor(null)
      toast.success('Task updated.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (task: Task) => {
    if (!user) return
    setBusyId(task.id)
    try {
      await deleteTask(user.id, task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      toast.success('Task deleted.')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks])
  const completedCount = tasks.length - pendingCount

  const visible = useMemo(() => {
    const list =
      filter === 'pending'
        ? tasks.filter((t) => !t.completed)
        : filter === 'completed'
          ? tasks.filter((t) => t.completed)
          : tasks
    // Pending first, then by date ascending.
    return [...list].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return a.task_date.localeCompare(b.task_date)
    })
  }, [tasks, filter])

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
          Tasks
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Jot down what you need to do and check it off.
        </p>
      </header>

      {/* Add task */}
      <form onSubmit={handleAdd} className="glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <label className="label" htmlFor="task-date">Date</label>
            <input
              id="task-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="task-title">Task</label>
            <input
              id="task-title"
              type="text"
              className="input"
              placeholder="e.g. Submit monthly report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <button type="submit" className="btn-primary sm:w-auto" disabled={adding}>
            {adding ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </div>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Pending"
          value={loading ? '—' : pendingCount}
          icon={Circle}
          accent="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Completed"
          value={loading ? '—' : completedCount}
          icon={CheckCircle2}
          accent="text-green-600"
          iconBg="bg-green-50"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(
          [
            ['all', 'All'],
            ['pending', 'Pending'],
            ['completed', 'Completed'],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filter === key
                ? 'bg-brand-600 text-white shadow-glass-sm'
                : 'bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2 px-4 py-12 text-center">
          <ListTodo className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {filter === 'completed'
              ? 'No completed tasks yet.'
              : filter === 'pending'
                ? 'Nothing pending — you’re all caught up! 🎉'
                : 'No tasks yet. Add your first one above.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              busy={busyId === task.id}
              onToggle={() => handleToggle(task)}
              onEdit={() => openEdit(task)}
              onDelete={() => handleDelete(task)}
            />
          ))}
        </ul>
      )}

      {/* Edit task */}
      <Dialog
        open={editFor !== null}
        onClose={() => setEditFor(null)}
        title="Edit task"
        footer={
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1"
              onClick={() => setEditFor(null)}
              disabled={savingEdit}
            >
              Cancel
            </button>
            <button
              className="btn-primary flex-1"
              onClick={confirmEdit}
              disabled={savingEdit}
            >
              {savingEdit ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" strokeWidth={3} />}
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          <div>
            <label className="label" htmlFor="edit-task-title">Task</label>
            <input
              id="edit-task-title"
              type="text"
              className="input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-task-date">Date</label>
            <input
              id="edit-task-date"
              type="date"
              className="input"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>
        </div>
      </Dialog>

      {/* Completion-date picker */}
      <Dialog
        open={completeFor !== null}
        onClose={() => setCompleteFor(null)}
        title="Mark as completed"
        footer={
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1"
              onClick={() => setCompleteFor(null)}
              disabled={savingComplete}
            >
              Cancel
            </button>
            <button
              className="btn-primary flex-1"
              onClick={confirmComplete}
              disabled={savingComplete}
            >
              {savingComplete ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" strokeWidth={3} />}
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-3 pb-2">
          {completeFor && (
            <p className="text-sm font-semibold text-slate-700">{completeFor.title}</p>
          )}
          <div>
            <label className="label" htmlFor="complete-date">Completed on</label>
            <input
              id="complete-date"
              type="date"
              className="input text-base"
              value={completeDate}
              max={todayKey()}
              onChange={(e) => setCompleteDate(e.target.value)}
              autoFocus
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Pick the date you finished this task.
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function TaskRow({
  task,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task
  busy: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const overdue = !task.completed && isPastKey(task.task_date)
  const today = isTodayKey(task.task_date)

  return (
    <li
      className={`glass-card-soft flex items-center gap-3 p-3.5 transition ${
        task.completed ? 'opacity-70' : ''
      }`}
    >
      {/* Complete toggle */}
      <button
        onClick={onToggle}
        disabled={busy}
        aria-label={task.completed ? 'Mark as not done' : 'Mark as completed'}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          task.completed
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-slate-300 text-transparent hover:border-brand-500'
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>

      {/* Title + date */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            task.completed ? 'text-slate-400 line-through' : 'text-slate-800'
          }`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-500">{formatFullDate(task.task_date)}</span>
          {today && !task.completed && (
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
              Today
            </span>
          )}
          {overdue && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
              Overdue
            </span>
          )}
          {task.completed && task.completed_at && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
              Completed {formatFullDate(toDateKey(new Date(task.completed_at)))}
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      {busy ? (
        <Spinner className="h-4 w-4 text-slate-400" />
      ) : (
        <div className="flex shrink-0 items-center">
          <button
            onClick={onEdit}
            aria-label="Edit task"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete task"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  )
}
