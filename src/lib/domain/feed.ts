import type { BabyEvent, BreastSide } from './types'

export function activeFeed(events: BabyEvent[]): BabyEvent | null {
  return events.find((e) => e.type === 'feed' && e.feed_ended_at === null) ?? null
}

export function lastBreastSide(events: BabyEvent[]): { side: BreastSide; at: string } | null {
  const breastFeeds = events
    .filter((e) => e.type === 'feed' && e.feed_method === 'breast' && e.breast_side)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  const last = breastFeeds[0]
  return last ? { side: last.breast_side as BreastSide, at: last.occurred_at } : null
}

export function feedDurationMinutes(feed: BabyEvent): number | null {
  if (!feed.feed_ended_at) return null
  const ms = new Date(feed.feed_ended_at).getTime() - new Date(feed.occurred_at).getTime()
  return Math.round(ms / 60000)
}

// Share of today (since local midnight) spent feeding. Feed intervals are
// clipped to [midnight, now], so cross-midnight and in-progress feeds count
// correctly. `feeds` counts feeds that started today.
export function feedingTodayMinutes(events: BabyEvent[], now: Date) {
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const m0 = midnight.getTime()
  const n = now.getTime()
  let feedMs = 0
  let feeds = 0
  for (const e of events) {
    if (e.type !== 'feed') continue
    const start = new Date(e.occurred_at).getTime()
    const end = e.feed_ended_at ? new Date(e.feed_ended_at).getTime() : n
    const overlap = Math.min(end, n) - Math.max(start, m0)
    if (overlap > 0) feedMs += overlap
    if (start >= m0 && start <= n) feeds++
  }
  const elapsedMs = Math.max(1, n - m0)
  return {
    feedMinutes: Math.round(feedMs / 60000),
    elapsedMinutes: Math.round(elapsedMs / 60000),
    percent: Math.round((feedMs / elapsedMs) * 100),
    feeds,
  }
}
