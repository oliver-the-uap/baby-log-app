import { NextResponse, type NextRequest } from 'next/server'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'
import { isFeedOverdue, shouldSendReminder } from '@/lib/domain/reminder'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  webpush.setVapidDetails(
    'mailto:oliver@theuap.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  const sb = createServiceClient()
  const now = new Date()

  const { data: settings } = await sb.from('app_settings').select('*').single()
  if (!settings?.feed_reminder_enabled) return NextResponse.json({ skipped: 'disabled' })

  const { data: lastFeed } = await sb
    .from('events')
    .select('occurred_at')
    .eq('type', 'feed')
    .order('occurred_at', { ascending: false })
    .limit(1)
  const lastFeedAt: string | null = lastFeed?.[0]?.occurred_at ?? null

  const overdue = isFeedOverdue(lastFeedAt, Number(settings.feed_reminder_hours), now)
  const send = shouldSendReminder(
    { overdue, lastSentAt: settings.last_feed_reminder_sent_at, lastFeedAt },
    now,
  )
  if (!send) return NextResponse.json({ sent: 0 })

  const { data: subs } = await sb.from('push_subscriptions').select('*')
  const payload = JSON.stringify({
    title: 'Feed reminder',
    body: `No feed logged in over ${settings.feed_reminder_hours}h.`,
  })

  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      sent++
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await sb.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }

  await sb
    .from('app_settings')
    .update({ last_feed_reminder_sent_at: now.toISOString() })
    .eq('id', settings.id)

  return NextResponse.json({ sent })
}
