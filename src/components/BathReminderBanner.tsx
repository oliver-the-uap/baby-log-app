'use client'
import { useEffect, useState } from 'react'
import { isBathDue } from '@/lib/domain/bathReminder'

export function BathReminderBanner({
  dob,
  lastBathAt,
  enabled,
}: {
  dob: string | null
  lastBathAt: string | null
  enabled: boolean
}) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 3_600_000)
    return () => clearInterval(id)
  }, [])

  if (!enabled || !dob) return null
  if (!isBathDue(lastBathAt, dob, new Date())) return null
  return (
    <div className="w-full bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200 p-3 text-sm">
      Bath time — it&apos;s been 3+ days since the last bath.
    </div>
  )
}
