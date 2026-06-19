import { describe, it, expect } from 'vitest'
import { ageSinceBirth } from '@/lib/domain/age'

describe('ageSinceBirth', () => {
  const dob = '2026-06-01'
  it('days', () => expect(ageSinceBirth(dob, '2026-06-15', 'days')).toBe(14))
  it('weeks', () => expect(ageSinceBirth(dob, '2026-06-15', 'weeks')).toBe(2))
  it('months (approx 30.44d)', () => expect(ageSinceBirth(dob, '2026-08-01', 'months')).toBe(2))
})
