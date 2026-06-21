import { describe, it, expect } from 'vitest'
import { activeSleep, sleepDurationMinutes, sleepingTodayMinutes } from '@/lib/domain/sleep'
import type { BabyEvent } from '@/lib/domain/types'

const base: BabyEvent = {
  id: '1', type: 'sleep', occurred_at: '2026-06-21T10:00:00', created_by: 'u', created_at: '',
  nappy_contents: null, feed_method: null, breast_side: null, feed_ended_at: null,
  sleep_ended_at: null, bottle_amount_ml: null, stat_type: null, stat_value: null, wash_kind: null,
}

describe('sleep helpers', () => {
  it('finds the active sleep', () => expect(activeSleep([base])?.id).toBe('1'))
  it('null when all sleeps ended', () =>
    expect(activeSleep([{ ...base, sleep_ended_at: '2026-06-21T11:00:00' }])).toBeNull())
  it('computes duration', () =>
    expect(sleepDurationMinutes({ ...base, sleep_ended_at: '2026-06-21T11:30:00' })).toBe(90))
  it('totals sleep today, counting in-progress to now', () => {
    const now = new Date('2026-06-21T12:00:00')
    const evs: BabyEvent[] = [
      { ...base, id: 'a', occurred_at: '2026-06-21T08:00:00', sleep_ended_at: '2026-06-21T09:00:00' }, // 60
      { ...base, id: 'b', occurred_at: '2026-06-21T11:30:00', sleep_ended_at: null }, // 30 (to now)
    ]
    expect(sleepingTodayMinutes(evs, now)).toBe(90)
  })
})
