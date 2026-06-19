'use client'
import { useState } from 'react'
import { createEvent, updateEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import { activeFeed, lastBreastSide } from '@/lib/domain/feed'
import type { BabyEvent, BreastSide } from '@/lib/domain/types'
import { Sheet } from './Sheet'

export function FeedFlow({
  events,
  onClose,
  onDone,
}: {
  events: BabyEvent[]
  onClose: () => void
  onDone: () => void
}) {
  const active = activeFeed(events)
  const last = lastBreastSide(events)
  const [method, setMethod] = useState<'breast' | 'bottle' | null>(null)
  const [amount, setAmount] = useState('')

  async function startBreast(side: BreastSide) {
    try {
      await createEvent({ type: 'feed', feed_method: 'breast', breast_side: side })
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }
  async function startBottle() {
    try {
      await createEvent({ type: 'feed', feed_method: 'bottle' })
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }
  async function stop() {
    const patch: Partial<BabyEvent> = { feed_ended_at: new Date().toISOString() }
    if (active!.feed_method === 'bottle' && amount) patch.bottle_amount_ml = parseInt(amount, 10)
    try {
      await updateEvent(active!.id, patch)
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }

  if (active) {
    return (
      <Sheet title="Stop feed" onClose={onClose}>
        {active.feed_method === 'bottle' && (
          <input
            className="w-full border rounded-lg p-3 mb-3"
            inputMode="numeric"
            placeholder="ml drunk (optional)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}
        <button onClick={stop} className="w-full bg-black text-white rounded-lg p-3">
          Stop feed
        </button>
      </Sheet>
    )
  }

  if (!method) {
    return (
      <Sheet title="Start feed" onClose={onClose}>
        {last && <p className="text-sm text-gray-600 mb-3">Last feed: {last.side} breast</p>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMethod('breast')} className="rounded-xl border p-4">
            Breast
          </button>
          <button onClick={startBottle} className="rounded-xl border p-4">
            Bottle
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Which side?" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        {(['left', 'right', 'both'] as const).map((s) => (
          <button key={s} onClick={() => startBreast(s)} className="rounded-xl border p-4 capitalize">
            {s}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
