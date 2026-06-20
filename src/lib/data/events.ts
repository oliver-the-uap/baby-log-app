import { createClient } from '@/lib/supabase/client'
import type { BabyEvent } from '@/lib/domain/types'

const PAGE = 30

export async function pageEvents(before?: string): Promise<BabyEvent[]> {
  let q = createClient()
    .from('events')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(PAGE)
  if (before) q = q.lt('occurred_at', before)
  const { data, error } = await q
  if (error) throw error
  return data as BabyEvent[]
}

// Recent events used to derive UI state (active feed, last side, banners).
export async function recentForState(): Promise<BabyEvent[]> {
  const { data, error } = await createClient()
    .from('events')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as BabyEvent[]
}

export async function createEvent(e: Partial<BabyEvent>): Promise<BabyEvent> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data, error } = await sb
    .from('events')
    .insert({ ...e, created_by: user!.id })
    .select('*')
    .single()
  if (error) throw error
  return data as BabyEvent
}

export async function updateEvent(id: string, patch: Partial<BabyEvent>): Promise<void> {
  const { error } = await createClient().from('events').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await createClient().from('events').delete().eq('id', id)
  if (error) throw error
}

export async function lastFeedStart(): Promise<string | null> {
  const { data, error } = await createClient()
    .from('events')
    .select('occurred_at')
    .eq('type', 'feed')
    .order('occurred_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.occurred_at ?? null
}

// All events oldest-first, for the horizontal timeline chart.
export async function allEventsForChart(): Promise<BabyEvent[]> {
  const { data, error } = await createClient()
    .from('events')
    .select('*')
    .order('occurred_at', { ascending: true })
    .limit(1000)
  if (error) throw error
  return data as BabyEvent[]
}

export async function lastWeightAt(): Promise<string | null> {
  const { data, error } = await createClient()
    .from('events')
    .select('occurred_at')
    .eq('type', 'body_stat')
    .eq('stat_type', 'weight')
    .order('occurred_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.occurred_at ?? null
}

export async function allBodyStats(): Promise<BabyEvent[]> {
  const { data, error } = await createClient()
    .from('events')
    .select('*')
    .eq('type', 'body_stat')
    .order('occurred_at', { ascending: true })
  if (error) throw error
  return data as BabyEvent[]
}
