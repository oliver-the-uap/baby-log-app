'use client'
import { createEvent, deleteEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import { useToast } from './ToastProvider'
import type { BabyEvent } from '@/lib/domain/types'

function sameLocalDay(iso: string, now: Date): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function VitaminD({ events, onChange }: { events: BabyEvent[]; onChange: () => void }) {
  const showToast = useToast()
  const now = new Date()
  const today = events.find((e) => e.type === 'vitamin_d' && sameLocalDay(e.occurred_at, now))

  async function give() {
    try {
      const ev = await createEvent({ type: 'vitamin_d' })
      showToast('Vitamin D logged', async () => {
        try {
          await deleteEvent(ev.id)
          onChange()
        } catch (e) {
          notifyError(e)
        }
      })
      onChange()
    } catch (e) {
      notifyError(e)
    }
  }

  if (today) {
    const time = new Date(today.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return (
      <div className="px-4 pb-1">
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-3 text-sm flex items-center justify-between">
          <span className="text-emerald-800 dark:text-emerald-200">💊 Vitamin D — done today ✓</span>
          <span className="text-xs text-emerald-700 dark:text-emerald-300">{time}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-1">
      <button
        onClick={give}
        className="w-full rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-3 text-sm flex items-center justify-between"
      >
        <span className="text-amber-900 dark:text-amber-200">💊 Vitamin D — not given today</span>
        <span className="font-semibold text-amber-900 dark:text-amber-100">Tap to log</span>
      </button>
    </div>
  )
}
