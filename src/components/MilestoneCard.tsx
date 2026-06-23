'use client'
import { useMemo } from 'react'
import { milestoneFor } from '@/lib/domain/milestones'

export function MilestoneCard({ dob }: { dob: string | null }) {
  const info = useMemo(() => {
    if (!dob) return null
    const ageDays = Math.floor((Date.now() - new Date(dob).getTime()) / 86_400_000)
    if (ageDays < 0) return null
    return milestoneFor(ageDays)
  }, [dob])

  if (!info?.current) return null
  return (
    <div className="px-4 pb-1">
      <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/30 p-3 text-sm">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-medium text-indigo-900 dark:text-indigo-200">✨ {info.current.label}</span>
          <span className="text-[11px] text-indigo-500/70 dark:text-indigo-300/50">for interest</span>
        </div>
        <p className="text-indigo-900/90 dark:text-indigo-100/90 leading-snug">{info.current.note}</p>
        {info.next && (
          <p className="text-[11px] text-indigo-500/70 dark:text-indigo-300/50 mt-1">Coming up · {info.next.label}</p>
        )}
      </div>
    </div>
  )
}
