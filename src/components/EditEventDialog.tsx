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
  const isFeed = event.type === 'feed'
  const [start, setStart] = useState(toLocalInput(event.occurred_at))
  const [end, setEnd] = useState(event.feed_ended_at ? toLocalInput(event.feed_ended_at) : '')

  const durationMins =
    isFeed && end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000) : null

  async function save() {
    if (durationMins != null && durationMins < 0) {
      notifyError(new Error('The end time must be after the start time.'))
      return
    }
    const patch: Partial<BabyEvent> = { occurred_at: new Date(start).toISOString() }
    if (isFeed) patch.feed_ended_at = end ? new Date(end).toISOString() : null
    try {
      await updateEvent(event.id, patch)
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
      <label className="block text-sm mb-1">{isFeed ? 'Start' : 'Time'}</label>
      <input
        type="datetime-local"
        className="w-full border rounded-lg p-3"
        value={start}
        onChange={(e) => setStart(e.target.value)}
      />

      {isFeed && (
        <>
          <label className="block text-sm mb-1 mt-3">End {end ? '' : '(in progress)'}</label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              className="flex-1 border rounded-lg p-3"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setEnd(toLocalInput(new Date().toISOString()))}
              className="px-4 border rounded-lg text-sm"
            >
              Now
            </button>
          </div>
          {end && (
            <p className="text-sm mt-2 text-gray-600">
              {durationMins != null && durationMins >= 0
                ? `Duration: ${durationMins} min${durationMins === 1 ? '' : 's'}`
                : 'End is before start'}
            </p>
          )}
        </>
      )}

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
