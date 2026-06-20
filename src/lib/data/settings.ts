import { createClient } from '@/lib/supabase/client'

export interface AppSettings {
  id: string
  feed_reminder_enabled: boolean
  feed_reminder_hours: number
  last_feed_reminder_sent_at: string | null
  weight_reminder_enabled: boolean
  last_weight_reminder_sent_at: string | null
}

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await createClient().from('app_settings').select('*').single()
  if (error) throw error
  return data as AppSettings
}

export async function updateSettings(
  patch: Partial<
    Pick<AppSettings, 'feed_reminder_enabled' | 'feed_reminder_hours' | 'weight_reminder_enabled'>
  >,
): Promise<void> {
  const s = await getSettings()
  const { error } = await createClient().from('app_settings').update(patch).eq('id', s.id)
  if (error) throw error
}
