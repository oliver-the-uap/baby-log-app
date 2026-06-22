import { createClient } from '@/lib/supabase/client'

export interface Note {
  id: string
  text: string
  done: boolean
  created_at: string
  done_at: string | null
}

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await createClient()
    .from('notes')
    .select('*')
    .order('done', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Note[]
}

export async function addNote(text: string): Promise<void> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { error } = await sb.from('notes').insert({ text, created_by: user!.id })
  if (error) throw error
}

export async function setNoteDone(id: string, done: boolean): Promise<void> {
  const { error } = await createClient()
    .from('notes')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await createClient().from('notes').delete().eq('id', id)
  if (error) throw error
}
