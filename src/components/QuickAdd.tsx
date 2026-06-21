'use client'
import { useState } from 'react'
import { createEvent, updateEvent, deleteEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import { activeSleep } from '@/lib/domain/sleep'
import { useToast } from './ToastProvider'
import { EliminationDialog } from './EliminationDialog'
import { WashDialog } from './WashDialog'
import { BodyStatDialog } from './BodyStatDialog'
import { FeedFlow } from './FeedFlow'
import type { BabyEvent } from '@/lib/domain/types'

export function QuickAdd({ events, onChange }: { events: BabyEvent[]; onChange: () => void }) {
  const [open, setOpen] = useState<null | 'elim' | 'wash' | 'feed' | 'stat'>(null)
  const sleeping = activeSleep(events)
  const showToast = useToast()

  async function toggleSleep() {
    try {
      if (sleeping) {
        const id = sleeping.id
        await updateEvent(id, { sleep_ended_at: new Date().toISOString() })
        showToast('Woke up', async () => {
          try {
            await updateEvent(id, { sleep_ended_at: null })
            onChange()
          } catch (e) {
            notifyError(e)
          }
        })
      } else {
        const ev = await createEvent({ type: 'sleep' })
        showToast('Sleep started', async () => {
          try {
            await deleteEvent(ev.id)
            onChange()
          } catch (e) {
            notifyError(e)
          }
        })
      }
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
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('wash')}>
          Wash
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
      {open === 'wash' && (
        <WashDialog onClose={() => setOpen(null)} onDone={() => { setOpen(null); onChange() }} />
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
