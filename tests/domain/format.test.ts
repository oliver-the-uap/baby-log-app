import { describe, it, expect } from 'vitest'
import { eventSummary } from '@/lib/domain/format'
import type { BabyEvent } from '@/lib/domain/types'

const e = (p: Partial<BabyEvent>): BabyEvent => ({
  id: '', type: 'nappy', occurred_at: '', created_by: '', created_at: '',
  nappy_contents: null, feed_method: null, breast_side: null, feed_ended_at: null,
  bottle_amount_ml: null, stat_type: null, stat_value: null, ...p,
})

describe('eventSummary', () => {
  it('nappy', () => expect(eventSummary(e({ type: 'nappy', nappy_contents: 'both' }))).toBe('Nappy — wee & poo'))
  it('bath', () => expect(eventSummary(e({ type: 'bath' }))).toBe('Bath'))
  it('breast feed', () => expect(eventSummary(e({ type: 'feed', feed_method: 'breast', breast_side: 'left' }))).toBe('Feed — left breast'))
  it('bottle feed with amount', () => expect(eventSummary(e({ type: 'feed', feed_method: 'bottle', bottle_amount_ml: 90 }))).toBe('Feed — bottle, 90ml'))
  it('weight stat', () => expect(eventSummary(e({ type: 'body_stat', stat_type: 'weight', stat_value: 4.2 }))).toBe('Weight — 4.2 kg'))
})
