'use client'
import { useEffect, useState } from 'react'
import { allBodyStats } from '@/lib/data/events'
import { getBaby } from '@/lib/data/baby'
import { notifyError } from '@/lib/notify'
import { GrowthChart } from '@/components/GrowthChart'
import type { BabyEvent } from '@/lib/domain/types'

export default function GrowthPage() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [dob, setDob] = useState<string | null>(null)

  useEffect(() => {
    allBodyStats().then(setEvents).catch(notifyError)
    getBaby().then((b) => setDob(b.date_of_birth)).catch(notifyError)
  }, [])

  if (!dob) return <p className="p-4">Loading…</p>
  return <GrowthChart events={events} dob={dob} />
}
