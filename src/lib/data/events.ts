import { createClient } from '@/lib/supabase/client'
import type { BabyEvent } from '@/lib/domain/types'
import { cacheGet, cacheSet } from '@/lib/offline/idb'
import { isOffline, cachedList, cachedValue, queueOp, asEvent, applyPending } from '@/lib/offline/sync'

const PAGE = 30

export async function pageEvents(before?: string): Promise<BabyEvent[]> {
  if (isOffline()) {
    const all = await applyPending((await cacheGet<BabyEvent[]>('recent')) ?? [])
    const filtered = before ? all.filter((e) => e.occurred_at < before) : all
    return filtered.slice(0, PAGE)
  }
  let q = createClient().from('events').select('*').order('occurred_at', { ascending: false }).limit(PAGE)
  if (before) q = q.lt('occurred_at', before)
  const { data, error } = await q
  if (error) throw error
  return data as BabyEvent[]
}

// Recent events used to derive UI state (active feed/sleep, banners, today stats).
export async function recentForState(): Promise<BabyEvent[]> {
  return cachedList('recent', async () => {
    const { data, error } = await createClient()
      .from('events')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data as BabyEvent[]
  })
}

export async function createEvent(e: Partial<BabyEvent>): Promise<BabyEvent> {
  const sb = createClient()
  if (isOffline()) {
    const { data: { session } } = await sb.auth.getSession()
    const row = {
      ...e,
      id: crypto.randomUUID(),
      occurred_at: e.occurred_at ?? new Date().toISOString(),
      created_by: session?.user.id,
    }
    await queueOp({ kind: 'insert', row })
    return asEvent(row)
  }
  const { data: { user } } = await sb.auth.getUser()
  const { data, error } = await sb.from('events').insert({ ...e, created_by: user!.id }).select('*').single()
  if (error) throw error
  return data as BabyEvent
}

export async function updateEvent(id: string, patch: Partial<BabyEvent>): Promise<void> {
  if (isOffline()) {
    await queueOp({ kind: 'update', id, patch })
    return
  }
  const { error } = await createClient().from('events').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteEvent(id: string): Promise<void> {
  if (isOffline()) {
    await queueOp({ kind: 'delete', id })
    return
  }
  const { error } = await createClient().from('events').delete().eq('id', id)
  if (error) throw error
}

export async function lastFeedStart(): Promise<string | null> {
  if (isOffline()) {
    const evs = await applyPending((await cacheGet<BabyEvent[]>('recent')) ?? [])
    return evs.find((e) => e.type === 'feed')?.occurred_at ?? null
  }
  const { data, error } = await createClient()
    .from('events')
    .select('occurred_at')
    .eq('type', 'feed')
    .order('occurred_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.occurred_at ?? null
}

export async function lastWeightAt(): Promise<string | null> {
  return cachedValue('lastWeight', async () => {
    const { data, error } = await createClient()
      .from('events')
      .select('occurred_at')
      .eq('type', 'body_stat')
      .eq('stat_type', 'weight')
      .order('occurred_at', { ascending: false })
      .limit(1)
    if (error) throw error
    return data?.[0]?.occurred_at ?? null
  }, null)
}

export async function lastBathAt(): Promise<string | null> {
  return cachedValue('lastBath', async () => {
    const { data, error } = await createClient()
      .from('events')
      .select('occurred_at')
      .eq('type', 'bath')
      .order('occurred_at', { ascending: false })
      .limit(1)
    if (error) throw error
    return data?.[0]?.occurred_at ?? null
  }, null)
}

// All events oldest-first, for the horizontal timeline chart.
export async function allEventsForChart(): Promise<BabyEvent[]> {
  if (isOffline()) {
    const cached = (await cacheGet<BabyEvent[]>('chart')) ?? []
    return (await applyPending(cached)).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
  }
  const { data, error } = await createClient()
    .from('events')
    .select('*')
    .order('occurred_at', { ascending: true })
    .limit(1000)
  if (error) throw error
  await cacheSet('chart', data as BabyEvent[])
  return data as BabyEvent[]
}

export async function allBodyStats(): Promise<BabyEvent[]> {
  return cachedValue('bodyStats', async () => {
    const { data, error } = await createClient()
      .from('events')
      .select('*')
      .eq('type', 'body_stat')
      .order('occurred_at', { ascending: true })
    if (error) throw error
    return data as BabyEvent[]
  }, [])
}
