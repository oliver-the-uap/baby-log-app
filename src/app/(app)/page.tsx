'use client'
import { useCallback, useEffect, useState } from 'react'
import { recentForState, lastFeedStart } from '@/lib/data/events'
import { getSettings } from '@/lib/data/settings'
import { notifyError } from '@/lib/notify'
import { QuickAdd } from '@/components/QuickAdd'
import { Timeline } from '@/components/Timeline'
import { TimelineChart } from '@/components/TimelineChart'
import { ActiveFeedBanner } from '@/components/ActiveFeedBanner'
import { OverdueFeedBanner } from '@/components/OverdueFeedBanner'
import { FeedFlow } from '@/components/FeedFlow'
import type { BabyEvent } from '@/lib/domain/types'

export default function HomePage() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [lastFeed, setLastFeed] = useState<string | null>(null)
  const [settings, setSettings] = useState({ feed_reminder_enabled: true, feed_reminder_hours: 4 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [stopOpen, setStopOpen] = useState(false)
  const [view, setView] = useState<'list' | 'chart'>('list')

  const refresh = useCallback(async () => {
    try {
      const [evs, lf, s] = await Promise.all([recentForState(), lastFeedStart(), getSettings()])
      setEvents(evs)
      setLastFeed(lf)
      setSettings({ feed_reminder_enabled: s.feed_reminder_enabled, feed_reminder_hours: Number(s.feed_reminder_hours) })
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
      <QuickAdd events={events} onChange={refresh} />

      <div className="flex gap-2 px-4 pb-1">
        <button
          onClick={() => setView('list')}
          className={`flex-1 rounded-lg border p-2 text-sm ${view === 'list' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
        >
          List
        </button>
        <button
          onClick={() => setView('chart')}
          className={`flex-1 rounded-lg border p-2 text-sm ${view === 'chart' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
        >
          Chart
        </button>
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
