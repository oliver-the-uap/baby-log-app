import { describe, it, expect } from 'vitest'
import { activeFeed, lastBreastSide, feedDurationMinutes, feedingTodayMinutes } from '@/lib/domain/feed'
import type { BabyEvent } from '@/lib/domain/types'

const base: BabyEvent = {
  id: '1', type: 'feed', occurred_at: '2026-06-20T10:00:00Z', created_by: 'u', created_at: '',
  nappy_contents: null, feed_method: 'breast', breast_side: 'left',
  feed_ended_at: null, sleep_ended_at: null, bottle_amount_ml: null, stat_type: null, stat_value: null,
}

describe('feed helpers', () => {
  it('finds the active (un-ended) feed', () => {
    expect(activeFeed([base])?.id).toBe('1')
  })
  it('returns null when all feeds ended', () => {
    expect(activeFeed([{ ...base, feed_ended_at: '2026-06-20T10:20:00Z' }])).toBeNull()
  })
  it('returns last breast side from most recent breast feed', () => {
    const older = { ...base, id: 'a', breast_side: 'right' as const, occurred_at: '2026-06-20T08:00:00Z', feed_ended_at: '2026-06-20T08:20:00Z' }
    const newer = { ...base, id: 'b', breast_side: 'left' as const, occurred_at: '2026-06-20T10:00:00Z', feed_ended_at: '2026-06-20T10:20:00Z' }
    expect(lastBreastSide([older, newer])).toEqual({ side: 'left', at: newer.occurred_at })
  })
  it('computes duration in minutes', () => {
    expect(feedDurationMinutes({ ...base, feed_ended_at: '2026-06-20T10:25:00Z' })).toBe(25)
  })

  it('computes share of today spent feeding', () => {
    const now = new Date('2026-06-20T12:00:00') // local midday => 720 min elapsed
    const evs: BabyEvent[] = [
      { ...base, id: 'x', occurred_at: '2026-06-20T10:00:00', feed_ended_at: '2026-06-20T11:00:00' }, // 60m
      { ...base, id: 'y', occurred_at: '2026-06-20T11:30:00', feed_ended_at: '2026-06-20T11:50:00' }, // 20m
      { ...base, id: 'z', type: 'nappy', feed_method: null, occurred_at: '2026-06-20T09:00:00', feed_ended_at: null },
    ]
    const r = feedingTodayMinutes(evs, now)
    expect(r.feedMinutes).toBe(80)
    expect(r.feeds).toBe(2)
    expect(r.percent).toBe(11) // 80/720
  })
})
