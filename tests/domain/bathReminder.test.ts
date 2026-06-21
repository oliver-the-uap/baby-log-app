import { describe, it, expect } from 'vitest'
import { isBathDue, shouldSendBathReminder } from '@/lib/domain/bathReminder'

const dob = '2026-05-31'

describe('isBathDue', () => {
  const now = new Date('2026-06-21T12:00:00Z')
  it('due at 3 days since last bath', () =>
    expect(isBathDue('2026-06-18T12:00:00Z', dob, now)).toBe(true))
  it('not due before 3 days', () =>
    expect(isBathDue('2026-06-19T12:00:00Z', dob, now)).toBe(false)) // 2 days
  it('due (from birth) when never bathed', () => expect(isBathDue(null, dob, now)).toBe(true))
})

describe('shouldSendBathReminder', () => {
  const now = new Date('2026-06-21T12:00:00Z')
  it('sends first time due', () =>
    expect(shouldSendBathReminder({ due: true, lastSentAt: null, lastBathAt: '2026-06-18T12:00:00Z' }, now)).toBe(true))
  it('does not resend within a day', () =>
    expect(shouldSendBathReminder({ due: true, lastSentAt: '2026-06-21T06:00:00Z', lastBathAt: '2026-06-18T12:00:00Z' }, now)).toBe(false))
  it('resends after a day', () =>
    expect(shouldSendBathReminder({ due: true, lastSentAt: '2026-06-19T06:00:00Z', lastBathAt: '2026-06-18T12:00:00Z' }, now)).toBe(true))
  it('does not send when not due', () =>
    expect(shouldSendBathReminder({ due: false, lastSentAt: null, lastBathAt: '2026-06-20T12:00:00Z' }, now)).toBe(false))
})
