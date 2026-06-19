'use client'
import { useState } from 'react'
import { updateEvent, deleteEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import type { BabyEvent } from '@/lib/domain/types'
import { Sheet } from './Sheet'

// Convert an ISO timestamp to the value a <input type="datetime-local"> expects (local time).
function toLocalInput(iso: string) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function EditEventDialog({
  event,
  onClose,
  onDone,
}: {
  event: BabyEvent
  onClose: () => void
  onDone: () => void
}) {
  const [when, setWhen] = useState(toLocalInput(event.occurred_at))

  async function save() {
    try {
      await updateEvent(event.id, { occurred_at: new Date(when).toISOString() })
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }
  async function remove() {
    try {
      await deleteEvent(event.id)
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }

  return (
    <Sheet title="Edit event" onClose={onClose}>
      <label className="block text-sm mb-1">Time</label>
      <input
        type="datetime-local"
        className="w-full border rounded-lg p-3"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
      />
      <div className="flex gap-3 mt-4">
        <button onClick={save} className="flex-1 bg-black text-white rounded-lg p-3">
          Save
        </button>
        <button onClick={remove} className="flex-1 border border-red-500 text-red-600 rounded-lg p-3">
          Delete
        </button>
      </div>
    </Sheet>
  )
}
