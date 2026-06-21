'use client'
import { activeSleep, sleepDurationMinutes } from '@/lib/domain/sleep'
import type { BabyEvent } from '@/lib/domain/types'

export function ActiveSleepBanner({ events, onWake }: { events: BabyEvent[]; onWake: () => void }) {
  const active = activeSleep(events)
  if (!active) return null
  const mins = sleepDurationMinutes({ ...active, sleep_ended_at: new Date().toISOString() }) ?? 0
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return (
    <button
      onClick={onWake}
      className="w-full bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200 p-3 text-left"
    >
      Asleep — {h > 0 ? `${h}h ` : ''}{m}m · tap to wake
    </button>
  )
}
