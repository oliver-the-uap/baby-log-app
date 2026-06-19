import { createClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('RLS', () => {
  it('blocks anonymous reads of events', async () => {
    const sb = createClient(url, anon)
    const { data } = await sb.from('events').select('*')
    expect(data ?? []).toHaveLength(0)
  })

  it('blocks anonymous inserts of events', async () => {
    const sb = createClient(url, anon)
    const { error } = await sb.from('events').insert({ type: 'bath' })
    expect(error).not.toBeNull()
  })

  it('blocks anonymous reads of the baby (DOB is private)', async () => {
    const sb = createClient(url, anon)
    const { data } = await sb.from('baby').select('*')
    expect(data ?? []).toHaveLength(0)
  })
})
