import { describe, it, expect } from 'vitest'
import { milestoneFor, MILESTONES } from '@/lib/domain/milestones'

describe('milestoneFor', () => {
  it('returns Week 1 for a newborn, with Week 2 next', () => {
    const r = milestoneFor(2)
    expect(r.current?.label).toBe('Week 1')
    expect(r.next?.label).toBe('Week 2')
  })
  it('returns Week 3 around day 16', () => {
    expect(milestoneFor(16).current?.label).toBe('Week 3')
  })
  it('clamps to the last milestone when very old, with no next', () => {
    const last = MILESTONES[MILESTONES.length - 1]
    const r = milestoneFor(10_000)
    expect(r.current?.label).toBe(last.label)
    expect(r.next).toBeNull()
  })
})
