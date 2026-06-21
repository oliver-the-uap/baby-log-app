'use client'
import { useState } from 'react'
import { createEvent, updateEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import { activeSleep } from '@/lib/domain/sleep'
import { EliminationDialog } from './EliminationDialog'
import { BodyStatDialog } from './BodyStatDialog'
import { FeedFlow } from './FeedFlow'
import type { BabyEvent } from '@/lib/domain/types'

export function QuickAdd({ events, onChange }: { events: BabyEvent[]; onChange: () => void }) {
  const [open, setOpen] = useState<null | 'elim' | 'feed' | 'stat'>(null)
  const sleeping = activeSleep(events)

  async function bath() {
    try {
      await createEvent({ type: 'bath' })
      onChange()
    } catch (e) {
      notifyError(e)
    }
  }

  async function toggleSleep() {
    try {
      if (sleeping) await updateEvent(sleeping.id, { sleep_ended_at: new Date().toISOString() })
      else await createEvent({ type: 'sleep' })
      onChange()
    } catch (e) {
      notifyError(e)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 p-4">
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('elim')}>
          Nappy / Potty
        </button>
        <button className="rounded-xl border p-5 text-lg" onClick={bath}>
          Bath
        </button>
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('feed')}>
          Feed
        </button>
        <button
          className={`rounded-xl border p-5 text-lg ${
            sleeping ? 'bg-violet-600 text-white border-violet-600' : ''
          }`}
          onClick={toggleSleep}
        >
          {sleeping ? 'Wake up' : 'Sleep'}
        </button>
        <button className="rounded-xl border p-5 text-lg col-span-2" onClick={() => setOpen('stat')}>
          Body stat
        </button>
      </div>
      {open === 'elim' && (
        <EliminationDialog onClose={() => setOpen(null)} onDone={() => { setOpen(null); onChange() }} />
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
