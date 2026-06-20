import { createClient } from '@/lib/supabase/client'
import type { Sex } from '@/lib/domain/growthReference'

export interface Baby {
  id: string
  name: string
  date_of_birth: string
  gender: Sex | null
}

export async function getBaby(): Promise<Baby> {
  const { data, error } = await createClient().from('baby').select('*').single()
  if (error) throw error
  return data as Baby
}

export async function updateBaby(
  patch: Partial<Pick<Baby, 'name' | 'date_of_birth' | 'gender'>>,
): Promise<void> {
  const b = await getBaby()
  const { error } = await createClient().from('baby').update(patch).eq('id', b.id)
  if (error) throw error
}
