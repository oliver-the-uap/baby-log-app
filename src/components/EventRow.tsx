'use client'
import { eventSummary } from '@/lib/domain/format'
import type { BabyEvent } from '@/lib/domain/types'

export function EventRow({ event, onEdit }: { event: BabyEvent; onEdit: () => void }) {
  const time = new Date(event.occurred_at).toLocaleString()
  const inProgress = event.type === 'feed' && event.feed_ended_at === null
  return (
    <button
      onClick={onEdit}
      className="w-full text-left border-b border-gray-200 dark:border-neutral-800 p-3 flex justify-between gap-3"
    >
      <span className="text-gray-900 dark:text-gray-100">
        {eventSummary(event)}
        {inProgress ? ' (in progress)' : ''}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">{time}</span>
    </button>
  )
}
