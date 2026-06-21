'use client'
import { createEvent, deleteEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import type { WashKind } from '@/lib/domain/types'
import { Sheet } from './Sheet'
import { useToast } from './ToastProvider'

export function WashDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const showToast = useToast()
  async function log(kind: WashKind) {
    try {
      const ev = await createEvent({ type: 'bath', wash_kind: kind })
      showToast(`${kind === 'shower' ? 'Shower' : 'Bath'} logged`, async () => {
        try {
          await deleteEvent(ev.id)
          onDone()
        } catch (e) {
          notifyError(e)
        }
      })
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
