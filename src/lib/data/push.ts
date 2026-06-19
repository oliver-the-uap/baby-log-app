import { createClient } from '@/lib/supabase/client'

export async function saveSubscription(sub: PushSubscriptionJSON): Promise<void> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { error } = await sb.from('push_subscriptions').upsert(
    {
      user_id: user!.id,
      endpoint: sub.endpoint!,
      p256dh: sub.keys!.p256dh,
      auth: sub.keys!.auth,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}
