import { createClient } from '@/lib/supabase/client'
import { cachedValue } from '@/lib/offline/sync'

export interface AppSettings {
  id: string
  feed_reminder_enabled: boolean
  feed_reminder_hours: number
  last_feed_reminder_sent_at: string | null
  weight_reminder_enabled: boolean
  last_weight_reminder_sent_at: string | null
  bath_reminder_enabled: boolean
  last_bath_reminder_sent_at: string | null
  vitd_reminder_enabled: boolean
  last_vitd_reminder_sent_at: string | null
}

const DEFAULT_SETTINGS: AppSettings = {
  id: '',
  feed_reminder_enabled: true,
  feed_reminder_hours: 4,
  last_feed_reminder_sent_at: null,
  weight_reminder_enabled: true,
  last_weight_reminder_sent_at: null,
  bath_reminder_enabled: true,
  last_bath_reminder_sent_at: null,
  vitd_reminder_enabled: true,
  last_vitd_reminder_sent_at: null,
}

export async function getSettings(): Promise<AppSettings> {
  return cachedValue(
    'settings',
    async () => {
      const { data, error } = await createClient().from('app_settings').select('*').single()
      if (error) throw error
      return data as AppSettings
    },
    DEFAULT_SETTINGS,
  )
}

export async function updateSettings(
  patch: Partial<
    Pick<
      AppSettings,
      | 'feed_reminder_enabled'
      | 'feed_reminder_hours'
      | 'weight_reminder_enabled'
      | 'bath_reminder_enabled'
      | 'vitd_reminder_enabled'
    >
  >,
): Promise<void> {
  const s = await getSettings()
  const { error } = await createClient().from('app_settings').update(patch).eq('id', s.id)
  if (error) throw error
}
