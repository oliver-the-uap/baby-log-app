import type { BabyEvent } from './types'

export function activeSleep(events: BabyEvent[]): BabyEvent | null {
  return events.find((e) => e.type === 'sleep' && e.sleep_ended_at === null) ?? null
}

export function sleepDurationMinutes(e: BabyEvent): number | null {
  if (!e.sleep_ended_at) return null
  const ms = new Date(e.sleep_ended_at).getTime() - new Date(e.occurred_at).getTime()
  return Math.round(ms / 60000)
}

// Total sleep today (since local midnight), clipped to [midnight, now] so
// cross-midnight and in-progress sleeps count correctly.
export function sleepingTodayMinutes(events: BabyEvent[], now: Date): number {
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const m0 = midnight.getTime()
  const n = now.getTime()
  let ms = 0
  for (const e of events) {
    if (e.type !== 'sleep') continue
    const start = new Date(e.occurred_at).getTime()
    const end = e.sleep_ended_at ? new Date(e.sleep_ended_at).getTime() : n
    const overlap = Math.min(end, n) - Math.max(start, m0)
    if (overlap > 0) ms += overlap
  }
  return Math.round(ms / 60000)
}
