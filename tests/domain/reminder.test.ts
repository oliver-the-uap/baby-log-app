import { describe, it, expect } from 'vitest'
import { isFeedOverdue, shouldSendReminder } from '@/lib/domain/reminder'

const now = new Date('2026-06-20T14:00:00Z')

describe('reminder logic', () => {
  it('is overdue when last feed start older than N hours', () => {
    expect(isFeedOverdue('2026-06-20T09:00:00Z', 4, now)).toBe(true)   // 5h
    expect(isFeedOverdue('2026-06-20T11:00:00Z', 4, now)).toBe(false)  // 3h
  })
  it('is not overdue when no feed has ever been logged', () => {
    expect(isFeedOverdue(null, 4, now)).toBe(false)
  })
  it('sends the first time it becomes overdue', () => {
    expect(shouldSendReminder({ overdue: true, lastSentAt: null, lastFeedAt: '2026-06-20T09:00:00Z' }, now)).toBe(true)
  })
  it('does not resend within an hour', () => {
    expect(shouldSendReminder({ overdue: true, lastSentAt: '2026-06-20T13:30:00Z', lastFeedAt: '2026-06-20T09:00:00Z' }, now)).toBe(false)
  })
  it('resends after an hour while still overdue', () => {
    expect(shouldSendReminder({ overdue: true, lastSentAt: '2026-06-20T12:30:00Z', lastFeedAt: '2026-06-20T09:00:00Z' }, now)).toBe(true)
  })
  it('does not send when not overdue', () => {
    expect(shouldSendReminder({ overdue: false, lastSentAt: null, lastFeedAt: '2026-06-20T13:00:00Z' }, now)).toBe(false)
  })
})
