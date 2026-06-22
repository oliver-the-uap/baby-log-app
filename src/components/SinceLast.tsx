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

  // last elimination, whether on the potty or in a nappy
  const lastChange = events.find((e) => e.type === 'potty' || e.type === 'nappy')?.occurred_at ?? null

  // sleep: show live status — asleep (how long) or awake (how long since waking)
  const lastSleep = events.find((e) => e.type === 'sleep')
  let sleepLabel = 'Last sleep'
  let sleepValue = '—'
  if (lastSleep) {
    if (lastSleep.sleep_ended_at == null) {
      sleepLabel = 'Asleep'
      sleepValue = ago(lastSleep.occurred_at, now)
    } else {
      sleepLabel = 'Awake'
      sleepValue = ago(lastSleep.sleep_ended_at, now)
    }
  }

  const items: { key: string; label: string; value: string }[] = [
    { key: 'feed', label: 'Last feed', value: ago(lastFeed, now) },
    { key: 'sleep', label: sleepLabel, value: sleepValue },
    { key: 'change', label: 'Last elimination', value: ago(lastChange, now) },
    { key: 'wash', label: 'Last wash', value: ago(lastWash, now) },
  ]

  return (
    <div className="px-4 pb-1">
      <div className="grid grid-cols-4 gap-2 text-center">
        {items.map((it) => (
          <div key={it.key} className="rounded-lg border p-2">
            <div className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">{it.label}</div>
            <div className="font-semibold text-sm tabular-nums">{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
