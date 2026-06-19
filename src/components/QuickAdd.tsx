'use client'
import { useState } from 'react'
import { createEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import { NappyDialog } from './NappyDialog'
import { BodyStatDialog } from './BodyStatDialog'
import { FeedFlow } from './FeedFlow'
import type { BabyEvent } from '@/lib/domain/types'

export function QuickAdd({ events, onChange }: { events: BabyEvent[]; onChange: () => void }) {
  const [open, setOpen] = useState<null | 'nappy' | 'feed' | 'stat'>(null)

  async function bath() {
    try {
      await createEvent({ type: 'bath' })
      onChange()
    } catch (e) {
      notifyError(e)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 p-4">
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('nappy')}>
          Nappy
        </button>
        <button className="rounded-xl border p-5 text-lg" onClick={bath}>
          Bath
        </button>
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('feed')}>
          Feed
        </button>
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('stat')}>
          Body stat
        </button>
      </div>
      {open === 'nappy' && (
        <NappyDialog onClose={() => setOpen(null)} onDone={() => { setOpen(null); onChange() }} />
      )}
      {open === 'stat' && (
        <BodyStatDialog onClose={() => setOpen(null)} onDone={() => { setOpen(null); onChange() }} />
      )}
      {open === 'feed' && (
        <FeedFlow events={events} onClose={() => setOpen(null)} onDone={() => { setOpen(null); onChange() }} />
      )}
    </>
  )
}
