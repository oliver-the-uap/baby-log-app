'use client'
import { useEffect, useState } from 'react'
import { isWeightDue, weightIntervalDays } from '@/lib/domain/weightReminder'

export function WeightReminderBanner({
  dob,
  lastWeightAt,
  enabled,
}: {
  dob: string | null
  lastWeightAt: string | null
  enabled: boolean
}) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 3_600_000) // hourly is plenty (day-scale)
    return () => clearInterval(id)
  }, [])

  if (!enabled || !dob) return null
  if (!isWeightDue(lastWeightAt, dob, new Date())) return null
  const interval = weightIntervalDays((Date.now() - new Date(dob).getTime()) / 86_400_000)
  return (
    <div className="w-full bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200 p-3 text-sm">
      Weigh-in due — log a weight (every {interval} days at this age).
    </div>
  )
}
