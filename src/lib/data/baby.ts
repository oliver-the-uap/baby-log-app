import { createClient } from '@/lib/supabase/client'

export interface Baby {
  id: string
  name: string
  date_of_birth: string
}

export async function getBaby(): Promise<Baby> {
  const { data, error } = await createClient().from('baby').select('*').single()
  if (error) throw error
  return data as Baby
}
