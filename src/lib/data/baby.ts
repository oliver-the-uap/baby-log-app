import { createClient } from '@/lib/supabase/client'
import { cachedValue } from '@/lib/offline/sync'
import type { Sex } from '@/lib/domain/growthReference'

export interface Baby {
  id: string
  name: string
  date_of_birth: string
  gender: Sex | null
}

const DEFAULT_BABY: Baby = { id: '', name: '', date_of_birth: '2025-01-01', gender: null }

export async function getBaby(): Promise<Baby> {
  return cachedValue(
    'baby',
    async () => {
      const { data, error } = await createClient().from('baby').select('*').single()
      if (error) throw error
      return data as Baby
    },
    DEFAULT_BABY,
  )
}

export async function updateBaby(
  patch: Partial<Pick<Baby, 'name' | 'date_of_birth' | 'gender'>>,
): Promise<void> {
  const b = await getBaby()
  const { error } = await createClient().from('baby').update(patch).eq('id', b.id)
  if (error) throw error
}
