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
