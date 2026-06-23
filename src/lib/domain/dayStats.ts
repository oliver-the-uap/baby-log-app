import type { BabyEvent } from './types'

export interface DayAgg {
  sleepMin: number
  feedMin: number
  awakeRestMin: number // time awake and not feeding (elapsed − sleep − feed)
  elapsedMin: number
  feeds: number
  changes: number // nappies + potties
  washes: number
  vitd: boolean
}

const overlap = (s: number, e: number, a: number, b: number) => Math.max(0, Math.min(e, b) - Math.max(s, a))

// Aggregate one local day window [dayStart, dayEnd); capped at `nowMs` for today.
export function aggregateDay(events: BabyEvent[], dayStart: number, dayEnd: number, nowMs: number): DayAgg {
  const end = Math.min(dayEnd, nowMs)
  const elapsedMin = Math.max(0, Math.round((end - dayStart) / 60000))
  let sleepMs = 0
  let feedMs = 0
  let feeds = 0
  let changes = 0
  let washes = 0
  let vitd = false
  for (const ev of events) {
    const s = new Date(ev.occurred_at).getTime()
    const inDay = s >= dayStart && s < dayEnd
    if (ev.type === 'sleep') {
      const e2 = ev.sleep_ended_at ? new Date(ev.sleep_ended_at).getTime() : nowMs
      sleepMs += overlap(s, e2, dayStart, end)
    } else if (ev.type === 'feed') {
      const e2 = ev.feed_ended_at ? new Date(ev.feed_ended_at).getTime() : nowMs
      feedMs += overlap(s, e2, dayStart, end)
      if (inDay) feeds++
    } else if (ev.type === 'nappy' || ev.type === 'potty') {
      if (inDay) changes++
    } else if (ev.type === 'bath') {
      if (inDay) washes++
    } else if (ev.type === 'vitamin_d') {
      if (inDay) vitd = true
    }
  }
  const sleepMin = Math.round(sleepMs / 60000)
  const feedMin = Math.round(feedMs / 60000)
  return {
    sleepMin,
    feedMin,
    awakeRestMin: Math.max(0, elapsedMin - sleepMin - feedMin),
    elapsedMin,
    feeds,
    changes,
    washes,
    vitd,
  }
}

// Local midnight (ms) for `back` days ago — 0 = today.
export function localMidnight(back: number, base: Date = new Date()): number {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - back)
  return d.getTime()
}
