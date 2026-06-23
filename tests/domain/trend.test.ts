import { describe, it, expect } from 'vitest'
import { movingAverage } from '@/lib/domain/trend'

describe('movingAverage', () => {
  it('smooths with a window of 3', () => {
    expect(movingAverage([1, 2, 3, 4], 3)).toEqual([1.5, 2, 3, 3.5])
  })
  it('keeps nulls null and skips them in the average', () => {
    expect(movingAverage([2, null, 4], 3)).toEqual([2, null, 4])
  })
  it('averages across a defined neighbourhood', () => {
    expect(movingAverage([6, 6, 9], 3)).toEqual([6, 7, 7.5])
  })
})
