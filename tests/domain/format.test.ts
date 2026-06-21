import { describe, it, expect } from 'vitest'
import { eventSummary } from '@/lib/domain/format'
import type { BabyEvent } from '@/lib/domain/types'

const e = (p: Partial<BabyEvent>): BabyEvent => ({
  id: '', type: 'nappy', occurred_at: '', created_by: '', created_at: '',
  nappy_contents: null, feed_method: null, breast_side: null, feed_ended_at: null,
  sleep_ended_at: null, bottle_amount_ml: null, stat_type: null, stat_value: null, wash_kind: null, ...p,
})

describe('eventSummary', () => {
  it('nappy', () => expect(eventSummary(e({ type: 'nappy', nappy_contents: 'both' }))).toBe('Nappy — wee & poo'))
  it('potty', () => expect(eventSummary(e({ type: 'potty', nappy_contents: 'poo' }))).toBe('Potty — poo'))
  it('wash (no kind)', () => expect(eventSummary(e({ type: 'bath' }))).toBe('Wash'))
  it('wash shower', () => expect(eventSummary(e({ type: 'bath', wash_kind: 'shower' }))).toBe('Wash — shower'))
  it('breast feed', () => expect(eventSummary(e({ type: 'feed', feed_method: 'breast', breast_side: 'left' }))).toBe('Feed — left breast'))
  it('breast feed, unknown side', () => expect(eventSummary(e({ type: 'feed', feed_method: 'breast', breast_side: null }))).toBe('Feed — breast'))
  it('breast feed with duration', () => expect(eventSummary(e({ type: 'feed', feed_method: 'breast', breast_side: 'left', occurred_at: '2026-06-20T10:00:00Z', feed_ended_at: '2026-06-20T10:25:00Z' }))).toBe('Feed — left breast (25 mins)'))
  it('feed duration is singular at 1 min', () => expect(eventSummary(e({ type: 'feed', feed_method: 'breast', breast_side: 'right', occurred_at: '2026-06-20T10:00:00Z', feed_ended_at: '2026-06-20T10:01:00Z' }))).toBe('Feed — right breast (1 min)'))
  it('bottle feed with amount', () => expect(eventSummary(e({ type: 'feed', feed_method: 'bottle', bottle_amount_ml: 90 }))).toBe('Feed — bottle, 90ml'))
  it('weight stat', () => expect(eventSummary(e({ type: 'body_stat', stat_type: 'weight', stat_value: 4.2 }))).toBe('Weight — 4.2 kg'))
})
