import { describe, it, expect } from 'vitest'
import { aggregateDay, localMidnight } from '@/lib/domain/dayStats'
import type { BabyEvent } from '@/lib/domain/types'

const base: BabyEvent = {
  id: '1', type: 'sleep', occurred_at: '2026-06-21T10:00:00', created_by: 'u', created_at: '',
  nappy_contents: null, feed_method: null, breast_side: null, feed_ended_at: null,
  sleep_ended_at: null, bottle_amount_ml: null, stat_type: null, stat_value: null, wash_kind: null,
}

const ms = (s: string) => new Date(s).getTime()

describe('aggregateDay', () => {
  const dayStart = ms('2026-06-21T00:00:00')
  const dayEnd = ms('2026-06-22T00:00:00')
  const farFuture = ms('2026-12-31T00:00:00') // past dayEnd, so a completed day

  it('sums sleep and feed minutes within the day', () => {
    const evs: BabyEvent[] = [
      { ...base, id: 's', type: 'sleep', occurred_at: '2026-06-21T08:00:00', sleep_ended_at: '2026-06-21T09:30:00' }, // 90m
      { ...base, id: 'f', type: 'feed', occurred_at: '2026-06-21T10:00:00', feed_ended_at: '2026-06-21T10:20:00' }, // 20m
    ]
    const agg = aggregateDay(evs, dayStart, dayEnd, farFuture)
    expect(agg.sleepMin).toBe(90)
    expect(agg.feedMin).toBe(20)
    expect(agg.feeds).toBe(1)
    expect(agg.sleeps).toBe(1)
  })

  it('clips an interval that straddles midnight to the day window', () => {
    const evs: BabyEvent[] = [
      // sleep from 23:00 prev day to 01:00 this day -> only 60m falls inside this day
      { ...base, id: 's', type: 'sleep', occurred_at: '2026-06-20T23:00:00', sleep_ended_at: '2026-06-21T01:00:00' },
    ]
    expect(aggregateDay(evs, dayStart, dayEnd, farFuture).sleepMin).toBe(60)
  })

  it('caps an in-progress interval and elapsed at now for today', () => {
    const now = ms('2026-06-21T12:00:00')
    const evs: BabyEvent[] = [
      { ...base, id: 's', type: 'sleep', occurred_at: '2026-06-21T11:00:00', sleep_ended_at: null }, // -> 60m to now
    ]
    const agg = aggregateDay(evs, dayStart, dayEnd, now)
    expect(agg.sleepMin).toBe(60)
    expect(agg.elapsedMin).toBe(12 * 60)
    expect(agg.awakeRestMin).toBe(12 * 60 - 60)
  })

  it('counts nappies and potties together as changes', () => {
    const evs: BabyEvent[] = [
      { ...base, id: 'n', type: 'nappy', occurred_at: '2026-06-21T06:00:00' },
      { ...base, id: 'p', type: 'potty', occurred_at: '2026-06-21T07:00:00' },
    ]
    expect(aggregateDay(evs, dayStart, dayEnd, farFuture).changes).toBe(2)
  })

  it('counts washes and flags vitamin D', () => {
    const evs: BabyEvent[] = [
      { ...base, id: 'b', type: 'bath', occurred_at: '2026-06-21T18:00:00', wash_kind: 'bath' },
      { ...base, id: 'v', type: 'vitamin_d', occurred_at: '2026-06-21T09:00:00' },
    ]
    const agg = aggregateDay(evs, dayStart, dayEnd, farFuture)
    expect(agg.washes).toBe(1)
    expect(agg.vitd).toBe(true)
  })

  it('ignores events outside the day for counts', () => {
    const evs: BabyEvent[] = [
      { ...base, id: 'n', type: 'nappy', occurred_at: '2026-06-22T06:00:00' }, // next day
    ]
    const agg = aggregateDay(evs, dayStart, dayEnd, farFuture)
    expect(agg.changes).toBe(0)
    expect(agg.vitd).toBe(false)
  })
})

describe('localMidnight', () => {
  it('0 = today midnight, 1 = yesterday, monotonic 24h apart', () => {
    const base = new Date('2026-06-21T15:30:00')
    const today = localMidnight(0, base)
    const yesterday = localMidnight(1, base)
    expect(new Date(today).getHours()).toBe(0)
    expect(today - yesterday).toBe(86_400_000)
  })
})
