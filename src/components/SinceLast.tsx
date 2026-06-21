'use client'
import { useEffect, useState } from 'react'
import type { BabyEvent } from '@/lib/domain/types'

function ago(iso: string | null, now: number): string {
  if (!iso) return '—'
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'now'
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function SinceLast({
  events,
  lastFeed,
  lastWash,
}: {
  events: BabyEvent[]
  lastFeed: string | null
  lastWash: string | null
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const lastSleep = events.find((e) => e.type === 'sleep')?.occurred_at ?? null
  const lastPotty = events.find((e) => e.type === 'potty')?.occurred_at ?? null
  const items: [string, string | null][] = [
    ['Feed', lastFeed],
    ['Sleep', lastSleep],
    ['Potty', lastPotty],
    ['Wash', lastWash],
  ]

  return (
    <div className="px-4 pb-1">
      <div className="grid grid-cols-4 gap-2 text-center">
        {items.map(([label, ts]) => (
          <div key={label} className="rounded-lg border p-2">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Last {label.toLowerCase()}</div>
            <div className="font-semibold text-sm tabular-nums">{ago(ts, now)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
