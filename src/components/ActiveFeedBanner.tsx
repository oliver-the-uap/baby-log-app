'use client'
import { activeFeed, feedDurationMinutes } from '@/lib/domain/feed'
import type { BabyEvent } from '@/lib/domain/types'

export function ActiveFeedBanner({
  events,
  onStop,
}: {
  events: BabyEvent[]
  onStop: () => void
}) {
  const active = activeFeed(events)
  if (!active) return null
  const mins = feedDurationMinutes({ ...active, feed_ended_at: new Date().toISOString() })
  return (
    <button onClick={onStop} className="w-full bg-amber-100 text-amber-900 p-3 text-left">
      Feeding in progress ({active.feed_method}) — {mins} min · tap to stop
    </button>
  )
}
