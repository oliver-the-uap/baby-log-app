'use client'
import { useEffect, useState } from 'react'
import { isFeedOverdue } from '@/lib/domain/reminder'
import { activeFeed } from '@/lib/domain/feed'
import type { BabyEvent } from '@/lib/domain/types'

export function OverdueFeedBanner({
  events,
  lastFeedAt,
  enabled,
  hours,
}: {
  events: BabyEvent[]
  lastFeedAt: string | null
  enabled: boolean
  hours: number
}) {
  const [, tick] = useState(0)
  // Re-check each minute so the banner appears without a reload.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!enabled || activeFeed(events)) return null
  if (!isFeedOverdue(lastFeedAt, hours, new Date())) return null
  return <div className="w-full bg-red-100 text-red-800 p-3">No feed logged in over {hours}h.</div>
}
