'use client'
import { useState } from 'react'
import { createEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import type { NappyContents } from '@/lib/domain/types'
import { Sheet } from './Sheet'
import { PottyCueButton } from './PottyCueButton'

// Nappy / Potty → choose location → choose wee / poo / both.
export function EliminationDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [place, setPlace] = useState<'nappy' | 'potty' | null>(null)

  async function log(contents: NappyContents) {
    try {
      await createEvent({ type: place!, nappy_contents: contents })
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }

  if (!place) {
    return (
      <Sheet title="Nappy or potty?" onClose={onClose}>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setPlace('nappy')} className="rounded-xl border p-5 text-lg">
            Nappy
          </button>
          <button onClick={() => setPlace('potty')} className="rounded-xl border p-5 text-lg">
            Potty
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title={place === 'nappy' ? 'Nappy' : 'Potty'} onClose={onClose}>
      {place === 'potty' && <PottyCueButton />}
      <div className="grid grid-cols-3 gap-3">
        {(['wee', 'poo', 'both'] as const).map((c) => (
          <button key={c} onClick={() => log(c)} className="rounded-xl border p-4 capitalize">
            {c === 'both' ? 'Wee & poo' : c}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
