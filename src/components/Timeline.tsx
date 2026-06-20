'use client'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { pageEvents } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import type { BabyEvent } from '@/lib/domain/types'
import { EventRow } from './EventRow'
import { EditEventDialog } from './EditEventDialog'

export function Timeline({
  refreshKey,
  onChange,
}: {
  refreshKey: number
  onChange: () => void
}) {
  const [items, setItems] = useState<BabyEvent[]>([])
  const [done, setDone] = useState(false)
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const sentinel = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    try {
      const before = items[items.length - 1]?.occurred_at
      const next = await pageEvents(before)
      setItems((prev) => [...prev, ...next])
      if (next.length === 0) setDone(true)
    } catch (e) {
      notifyError(e)
    }
  }, [items])

  // Reset and reload from the top whenever the parent signals a change.
  useEffect(() => {
    setItems([])
    setDone(false)
    pageEvents().then(setItems).catch(notifyError)
  }, [refreshKey])

  useEffect(() => {
    if (done || !sentinel.current) return
    const ob = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    })
    ob.observe(sentinel.current)
    return () => ob.disconnect()
  }, [loadMore, done])

  return (
    <div>
      {items.map((e, i) => {
        const fmt = (iso: string) =>
          new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
        const day = fmt(e.occurred_at)
        const newDay = i === 0 || day !== fmt(items[i - 1].occurred_at)
        return (
          <Fragment key={e.id}>
            {newDay && (
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 border-t border-b border-gray-200 dark:border-neutral-700">
                {day}
              </div>
            )}
            <EventRow event={e} onEdit={() => setEditing(e)} />
          </Fragment>
        )
      })}
      {!done && <div ref={sentinel} className="h-10" />}
      {editing && (
        <EditEventDialog
          event={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null)
            onChange()
          }}
        />
      )}
    </div>
  )
}
