'use client'
import { createEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import type { WashKind } from '@/lib/domain/types'
import { Sheet } from './Sheet'

export function WashDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  async function log(kind: WashKind) {
    try {
      await createEvent({ type: 'bath', wash_kind: kind })
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }
  return (
    <Sheet title="Wash" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => log('bath')} className="rounded-xl border p-5 text-lg">
          Bath
        </button>
        <button onClick={() => log('shower')} className="rounded-xl border p-5 text-lg">
          Shower
        </button>
      </div>
    </Sheet>
  )
}
