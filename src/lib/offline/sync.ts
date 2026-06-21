import { createClient } from '@/lib/supabase/client'
import { cacheGet, cacheSet, outboxAdd, outboxAll, outboxRemove } from './idb'
import type { BabyEvent } from '@/lib/domain/types'

export type Op =
  | { seq?: number; kind: 'insert'; row: Record<string, unknown> }
  | { seq?: number; kind: 'update'; id: string; patch: Record<string, unknown> }
  | { seq?: number; kind: 'delete'; id: string }

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export async function queueOp(op: Op): Promise<void> {
  await outboxAdd(op)
}

// Turn a queued insert payload into a full event for the optimistic view.
export function asEvent(row: Record<string, unknown>): BabyEvent {
  const g = (k: string) => (row[k] ?? null) as never
  return {
    id: row.id as string,
    type: row.type as BabyEvent['type'],
    occurred_at: row.occurred_at as string,
    created_by: (row.created_by as string) ?? '',
    created_at: new Date().toISOString(),
    nappy_contents: g('nappy_contents'),
    feed_method: g('feed_method'),
    breast_side: g('breast_side'),
    feed_ended_at: g('feed_ended_at'),
    sleep_ended_at: g('sleep_ended_at'),
    bottle_amount_ml: g('bottle_amount_ml'),
    stat_type: g('stat_type'),
    stat_value: g('stat_value'),
  }
}

// Apply queued ops to a cached list for an optimistic offline view.
export async function applyPending(events: BabyEvent[]): Promise<BabyEvent[]> {
  const ops = await outboxAll<Op>()
  let list = [...events]
  for (const op of ops) {
    if (op.kind === 'insert') {
      const ev = asEvent(op.row)
      list = [ev, ...list.filter((e) => e.id !== ev.id)]
    } else if (op.kind === 'update') {
      list = list.map((e) => (e.id === op.id ? ({ ...e, ...op.patch } as BabyEvent) : e))
    } else if (op.kind === 'delete') {
      list = list.filter((e) => e.id !== op.id)
    }
  }
  return list.sort((a, b) => (b.occurred_at ?? '').localeCompare(a.occurred_at ?? ''))
}

// Read helper: online -> fetch + cache; offline -> cached list with pending applied.
export async function cachedList(key: string, fetcher: () => Promise<BabyEvent[]>): Promise<BabyEvent[]> {
  if (isOffline()) return applyPending((await cacheGet<BabyEvent[]>(key)) ?? [])
  const data = await fetcher()
  await cacheSet(key, data)
  return data
}

// Read helper for non-list values: online -> fetch + cache; offline -> cached or fallback.
export async function cachedValue<T>(key: string, fetcher: () => Promise<T>, fallback: T): Promise<T> {
  if (isOffline()) {
    const c = await cacheGet<T>(key)
    return c === undefined ? fallback : c
  }
  const data = await fetcher()
  await cacheSet(key, data)
  return data
}

let flushing = false
// Replay queued writes against Supabase, in order, stopping on first failure.
export async function flushOutbox(): Promise<void> {
  if (flushing || isOffline()) return
  flushing = true
  try {
    const sb = createClient()
    const ops = await outboxAll<Op>()
    for (const op of ops) {
      try {
        if (op.kind === 'insert') {
          const { error } = await sb.from('events').upsert(op.row)
          if (error) throw error
        } else if (op.kind === 'update') {
          const { error } = await sb.from('events').update(op.patch).eq('id', op.id)
          if (error) throw error
        } else {
          const { error } = await sb.from('events').delete().eq('id', op.id)
          if (error) throw error
        }
        await outboxRemove(op.seq!)
      } catch {
        break // likely offline again or transient; keep remaining ops queued
      }
    }
  } finally {
    flushing = false
  }
}
