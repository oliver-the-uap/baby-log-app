import { NextResponse, type NextRequest } from 'next/server'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'
import { isFeedOverdue, shouldSendReminder } from '@/lib/domain/reminder'
import { isWeightDue, shouldSendWeightReminder, weightIntervalDays } from '@/lib/domain/weightReminder'
import { isBathDue, shouldSendBathReminder } from '@/lib/domain/bathReminder'

export const runtime = 'nodejs'

type Note = { title: string; body: string; tag: string }

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
  if (!settings) return NextResponse.json({ error: 'no settings' }, { status: 500 })

  const notes: Note[] = []

  // --- Feed reminder ---
  if (settings.feed_reminder_enabled) {
    const { data: lastFeed } = await sb
      .from('events').select('occurred_at')
      .eq('type', 'feed').order('occurred_at', { ascending: false }).limit(1)
    const lastFeedAt: string | null = lastFeed?.[0]?.occurred_at ?? null
    const overdue = isFeedOverdue(lastFeedAt, Number(settings.feed_reminder_hours), now)
    if (shouldSendReminder({ overdue, lastSentAt: settings.last_feed_reminder_sent_at, lastFeedAt }, now)) {
      notes.push({ title: 'Feed reminder', body: `No feed logged in over ${settings.feed_reminder_hours}h.`, tag: 'feed-reminder' })
      await sb.from('app_settings').update({ last_feed_reminder_sent_at: now.toISOString() }).eq('id', settings.id)
    }
  }

  // baby record is shared by the weight + bath reminders
  let baby: { name: string; date_of_birth: string } | null = null
  if (settings.weight_reminder_enabled || settings.bath_reminder_enabled || settings.vitd_reminder_enabled) {
    const { data } = await sb.from('baby').select('name, date_of_birth').single()
    baby = data
  }

  // --- Weight reminder ---
  if (settings.weight_reminder_enabled && baby?.date_of_birth) {
    const { data: lastW } = await sb
      .from('events').select('occurred_at')
      .eq('type', 'body_stat').eq('stat_type', 'weight')
      .order('occurred_at', { ascending: false }).limit(1)
    const lastWeightAt: string | null = lastW?.[0]?.occurred_at ?? null
    const due = isWeightDue(lastWeightAt, baby.date_of_birth, now)
    if (shouldSendWeightReminder({ due, lastSentAt: settings.last_weight_reminder_sent_at, lastWeightAt }, now)) {
      const interval = weightIntervalDays((now.getTime() - new Date(baby.date_of_birth).getTime()) / 86_400_000)
      notes.push({ title: 'Weigh-in reminder', body: `Time to log ${baby.name}'s weight (every ${interval} days).`, tag: 'weight-reminder' })
      await sb.from('app_settings').update({ last_weight_reminder_sent_at: now.toISOString() }).eq('id', settings.id)
    }
  }

  // --- Bath reminder ---
  if (settings.bath_reminder_enabled && baby?.date_of_birth) {
    const { data: lastB } = await sb
      .from('events').select('occurred_at')
      .eq('type', 'bath').order('occurred_at', { ascending: false }).limit(1)
    const lastBathAt: string | null = lastB?.[0]?.occurred_at ?? null
    const due = isBathDue(lastBathAt, baby.date_of_birth, now)
    if (shouldSendBathReminder({ due, lastSentAt: settings.last_bath_reminder_sent_at, lastBathAt }, now)) {
      notes.push({ title: 'Wash reminder', body: `It's been a few days — time for ${baby.name}'s bath or shower.`, tag: 'bath-reminder' })
      await sb.from('app_settings').update({ last_bath_reminder_sent_at: now.toISOString() }).eq('id', settings.id)
    }
  }

  // --- Vitamin D reminder (evening nudge if not logged today) ---
  if (settings.vitd_reminder_enabled && baby?.name) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    })
    const parts = (d: Date) => {
      const p = fmt.formatToParts(d)
      const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
      return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: parseInt(g('hour'), 10) }
    }
    const todayLondon = parts(now)
    const { data: lastVitd } = await sb
      .from('events').select('occurred_at')
      .eq('type', 'vitamin_d').order('occurred_at', { ascending: false }).limit(1)
    const givenToday = lastVitd?.[0] ? parts(new Date(lastVitd[0].occurred_at)).date === todayLondon.date : false
    const sentToday = settings.last_vitd_reminder_sent_at
      ? parts(new Date(settings.last_vitd_reminder_sent_at)).date === todayLondon.date
      : false
    if (!givenToday && !sentToday && todayLondon.hour >= 17) {
      notes.push({ title: 'Vitamin D', body: `Has ${baby.name} had her vitamin D drop today?`, tag: 'vitd-reminder' })
      await sb.from('app_settings').update({ last_vitd_reminder_sent_at: now.toISOString() }).eq('id', settings.id)
    }
  }

  if (notes.length === 0) return NextResponse.json({ sent: 0 })

  const { data: subs } = await sb.from('push_subscriptions').select('*')
  let sent = 0
  for (const note of notes) {
    const payload = JSON.stringify(note)
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent++
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await sb.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }
  return NextResponse.json({ sent, notes: notes.map((n) => n.tag) })
}
