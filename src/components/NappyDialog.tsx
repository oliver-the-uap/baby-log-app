'use client'
import { createEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import type { NappyContents } from '@/lib/domain/types'
import { Sheet } from './Sheet'

export function NappyDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  async function log(contents: NappyContents) {
    try {
      await createEvent({ type: 'nappy', nappy_contents: contents })
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }
  return (
    <Sheet title="Nappy" onClose={onClose}>
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
