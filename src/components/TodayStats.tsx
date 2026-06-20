'use client'
import { useEffect, useState } from 'react'
import { feedingTodayMinutes } from '@/lib/domain/feed'
import type { BabyEvent } from '@/lib/domain/types'

export function TodayStats({ events }: { events: BabyEvent[] }) {
  // re-render each minute so the % keeps up (esp. during an in-progress feed)
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const now = new Date()
  const { percent, feedMinutes, feeds } = feedingTodayMinutes(events, now)
  const h = Math.floor(feedMinutes / 60)
  const m = feedMinutes % 60
  const dur = `${h > 0 ? `${h}h ` : ''}${m}m`

  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const changes = events.filter(
    (e) => (e.type === 'nappy' || e.type === 'potty') && new Date(e.occurred_at) >= midnight,
  ).length

  return (
    <div className="px-4 pb-1">
      <div className="rounded-lg border p-3 text-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Feeding today</span>
          <span className="font-semibold">
            {percent}% · {dur} · {feeds} feed{feeds === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Nappies / potties today</span>
          <span className="font-semibold">{changes}</span>
        </div>
      </div>
    </div>
  )
}
