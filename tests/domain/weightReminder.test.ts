import { describe, it, expect } from 'vitest'
import { weightIntervalDays, isWeightDue, shouldSendWeightReminder } from '@/lib/domain/weightReminder'

describe('weightIntervalDays', () => {
  it('every 4 days before 12 weeks', () => expect(weightIntervalDays(20)).toBe(4))
  it('weekly from 12 weeks', () => expect(weightIntervalDays(12 * 7)).toBe(7))
  it('weekly mid first year', () => expect(weightIntervalDays(200)).toBe(7))
  it('stops after the first year', () => expect(weightIntervalDays(52 * 7)).toBeNull())
})

describe('isWeightDue', () => {
  const dob = '2026-05-31'
  const now = new Date('2026-06-20T12:00:00Z') // ~20 days old -> 4-day interval
  it('due when last weight older than interval', () =>
    expect(isWeightDue('2026-06-16T12:00:00Z', dob, now)).toBe(true)) // 4 days
  it('not due when recent', () =>
    expect(isWeightDue('2026-06-18T12:00:00Z', dob, now)).toBe(false)) // 2 days
  it('due when never weighed', () => expect(isWeightDue(null, dob, now)).toBe(true))
  it('not due after first year', () =>
    expect(isWeightDue('2027-01-01', dob, new Date('2027-07-01T12:00:00Z'))).toBe(false))
})

describe('shouldSendWeightReminder', () => {
  const now = new Date('2026-06-20T12:00:00Z')
  it('sends first time due', () =>
    expect(shouldSendWeightReminder({ due: true, lastSentAt: null, lastWeightAt: '2026-06-16T12:00:00Z' }, now)).toBe(true))
  it('does not resend within a day', () =>
    expect(shouldSendWeightReminder({ due: true, lastSentAt: '2026-06-20T06:00:00Z', lastWeightAt: '2026-06-16T12:00:00Z' }, now)).toBe(false))
  it('resends after a day', () =>
    expect(shouldSendWeightReminder({ due: true, lastSentAt: '2026-06-18T06:00:00Z', lastWeightAt: '2026-06-16T12:00:00Z' }, now)).toBe(true))
  it('does not send when not due', () =>
    expect(shouldSendWeightReminder({ due: false, lastSentAt: null, lastWeightAt: '2026-06-19T12:00:00Z' }, now)).toBe(false))
})
