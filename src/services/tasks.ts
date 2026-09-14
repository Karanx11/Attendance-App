import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'

export async function getTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('completed', { ascending: true })
    .order('task_date', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function addTask(
  userId: string,
  taskDate: string,
  title: string,
  notes: string | null = null
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ user_id: userId, task_date: taskDate, title, notes })
    .select('*')
    .single()
  if (error) throw error
  return data as Task
}

export async function toggleTask(
  userId: string,
  id: string,
  completed: boolean,
  completedAt?: string | null
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed,
      completed_at: completed
        ? (completedAt ?? new Date().toISOString())
        : null,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as Task
}

export async function updateTask(
  userId: string,
  id: string,
  patch: Partial<Pick<Task, 'title' | 'task_date' | 'notes'>>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as Task
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}
