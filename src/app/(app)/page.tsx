'use client'
import { useCallback, useEffect, useState } from 'react'
import { recentForState, lastFeedStart, lastWeightAt } from '@/lib/data/events'
import { getSettings } from '@/lib/data/settings'
import { getBaby } from '@/lib/data/baby'
import { notifyError } from '@/lib/notify'
import { QuickAdd } from '@/components/QuickAdd'
import { TodayStats } from '@/components/TodayStats'
import { Timeline } from '@/components/Timeline'
import { TimelineChart } from '@/components/TimelineChart'
import { ActiveFeedBanner } from '@/components/ActiveFeedBanner'
import { OverdueFeedBanner } from '@/components/OverdueFeedBanner'
import { WeightReminderBanner } from '@/components/WeightReminderBanner'
import { FeedFlow } from '@/components/FeedFlow'
import type { BabyEvent } from '@/lib/domain/types'

export default function HomePage() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [lastFeed, setLastFeed] = useState<string | null>(null)
  const [lastWeight, setLastWeight] = useState<string | null>(null)
  const [dob, setDob] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    feed_reminder_enabled: true,
    feed_reminder_hours: 4,
    weight_reminder_enabled: true,
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [stopOpen, setStopOpen] = useState(false)
  const [view, setView] = useState<'list' | 'chart'>('chart')

  const refresh = useCallback(async () => {
    try {
      const [evs, lf, lw, s, baby] = await Promise.all([
        recentForState(),
        lastFeedStart(),
        lastWeightAt(),
        getSettings(),
        getBaby(),
      ])
      setEvents(evs)
      setLastFeed(lf)
      setLastWeight(lw)
      setDob(baby.date_of_birth)
      setSettings({
        feed_reminder_enabled: s.feed_reminder_enabled,
        feed_reminder_hours: Number(s.feed_reminder_hours),
        weight_reminder_enabled: s.weight_reminder_enabled,
      })
      setRefreshKey((k) => k + 1)
    } catch (e) {
      notifyError(e)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <main>
      <ActiveFeedBanner events={events} onStop={() => setStopOpen(true)} />
      <OverdueFeedBanner
        events={events}
        lastFeedAt={lastFeed}
        enabled={settings.feed_reminder_enabled}
        hours={settings.feed_reminder_hours}
      />
      <WeightReminderBanner dob={dob} lastWeightAt={lastWeight} enabled={settings.weight_reminder_enabled} />

      <QuickAdd events={events} onChange={refresh} />

      <TodayStats events={events} />

      <div className="px-4 pb-2">
        <div className="flex w-full rounded-full bg-gray-100 dark:bg-neutral-800 p-1 text-sm">
          {(['chart', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`flex-1 rounded-full py-1.5 capitalize transition ${
                view === v
                  ? 'bg-white dark:bg-neutral-600 shadow-sm font-medium text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <Timeline refreshKey={refreshKey} onChange={refresh} />
      ) : (
        <TimelineChart refreshKey={refreshKey} onChange={refresh} />
      )}

      {stopOpen && (
        <FeedFlow
          events={events}
          onClose={() => setStopOpen(false)}
          onDone={() => {
            setStopOpen(false)
            refresh()
          }}
        />
      )}
    </main>
  )
}
