'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { allEventsForChart } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import { eventSummary } from '@/lib/domain/format'
import type { BabyEvent, EventType } from '@/lib/domain/types'
import { EditEventDialog } from './EditEventDialog'

// One row per lane; nappy + potty share a lane (distinguished by colour).
const LANES: { label: string; types: EventType[] }[] = [
  { label: 'Feed', types: ['feed'] },
  { label: 'Sleep', types: ['sleep'] },
  { label: 'Nappy/Potty', types: ['nappy', 'potty'] },
  { label: 'Bath', types: ['bath'] },
]
const LEGEND: { type: EventType; label: string }[] = [
  { type: 'feed', label: 'Feed' },
  { type: 'sleep', label: 'Sleep' },
  { type: 'nappy', label: 'Nappy' },
  { type: 'potty', label: 'Potty' },
  { type: 'bath', label: 'Bath' },
]
const laneIndexOf = (t: EventType) => LANES.findIndex((l) => l.types.includes(t))
const LANE_H = 30
const AXIS_H = 34
const ZOOMS = [40, 80, 150] // px per hour

function colorFor(e: BabyEvent): string {
  if (e.type === 'feed') return e.feed_method === 'bottle' ? 'bg-sky-400' : 'bg-teal-500'
  if (e.type === 'sleep') return 'bg-violet-500'
  if (e.type === 'nappy') return 'bg-amber-500'
  if (e.type === 'potty') return 'bg-emerald-600'
  return 'bg-purple-500'
}

export function TimelineChart({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [zoom, setZoom] = useState(1)
  const [selected, setSelected] = useState<BabyEvent | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [nowTs] = useState(() => Date.now())

  useEffect(() => {
    allEventsForChart().then(setEvents).catch(notifyError)
  }, [refreshKey])

  const pxPerMin = ZOOMS[zoom] / 60

  const { width, blocks, dayTicks } = useMemo(() => {
    const laneTypes = LANES.flatMap((l) => l.types)
    const evs = events.filter((e) => laneTypes.includes(e.type))
    const minTime = evs.length ? new Date(evs[0].occurred_at).getTime() : nowTs - 24 * 3600e3
    const maxTime = nowTs
    const xOf = (t: number) => ((t - minTime) / 60000) * pxPerMin
    const width = Math.max(320, xOf(maxTime))
    const blocks = evs.map((e) => {
      const lane = laneIndexOf(e.type)
      const start = new Date(e.occurred_at).getTime()
      let w = 9
      if (e.type === 'feed') {
        const end = e.feed_ended_at ? new Date(e.feed_ended_at).getTime() : nowTs
        w = Math.max(7, ((end - start) / 60000) * pxPerMin)
      } else if (e.type === 'sleep') {
        const end = e.sleep_ended_at ? new Date(e.sleep_ended_at).getTime() : nowTs
        w = Math.max(7, ((end - start) / 60000) * pxPerMin)
      }
      return { e, lane, left: xOf(start), w }
    })
    const dayTicks: { x: number; label: string }[] = []
    const d = new Date(minTime)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 1)
    for (; d.getTime() <= maxTime; d.setDate(d.getDate() + 1)) {
      dayTicks.push({ x: xOf(d.getTime()), label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) })
    }
    return { width, blocks, dayTicks }
  }, [events, pxPerMin, nowTs])

  // start scrolled to "now" (far right) whenever width changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [width])

  const chartH = AXIS_H + LANES.length * LANE_H

  return (
    <div className="px-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {LEGEND.map((l) => (
            <span key={l.type} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded-sm ${colorFor({ type: l.type } as BabyEvent)}`} />
              {l.label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setZoom((z) => Math.max(0, z - 1))} className="border rounded px-2 text-sm" aria-label="Zoom out">−</button>
          <button onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} className="border rounded px-2 text-sm" aria-label="Zoom in">+</button>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden flex">
        <div className="shrink-0 w-16 bg-gray-50 dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700">
          <div style={{ height: AXIS_H }} />
          {LANES.map((l) => (
            <div
              key={l.label}
              style={{ height: LANE_H }}
              className="flex items-center px-2 text-xs border-t border-gray-200 dark:border-neutral-700 leading-tight"
            >
              {l.label}
            </div>
          ))}
        </div>
        <div ref={scrollRef} className="overflow-x-auto flex-1">
          <div className="relative" style={{ width, height: chartH }}>
            {LANES.map((l, i) => (
              <div
                key={l.label}
                className={i % 2 ? 'bg-gray-50 dark:bg-neutral-800/40' : 'bg-white dark:bg-neutral-900'}
                style={{ position: 'absolute', top: AXIS_H + i * LANE_H, left: 0, width, height: LANE_H, borderTop: '1px solid rgba(120,120,120,0.22)' }}
              />
            ))}
            {dayTicks.map((t, i) => (
              <div key={i}>
                <div style={{ position: 'absolute', left: t.x, top: 0, height: chartH, borderLeft: '1px solid rgba(120,120,120,0.35)' }} />
                <div style={{ position: 'absolute', left: t.x + 4, top: 8, fontSize: 11 }} className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {t.label}
                </div>
              </div>
            ))}
            <div style={{ position: 'absolute', left: Math.max(0, width - 2), top: 0, height: chartH, borderLeft: '2px solid #ef4444' }} />
            {blocks.map(({ e, lane, left, w }) => (
              <button
                key={e.id}
                title={`${eventSummary(e)} · ${new Date(e.occurred_at).toLocaleString()}`}
                onClick={() => setSelected(e)}
                className={`${colorFor(e)} rounded-sm`}
                style={{ position: 'absolute', left, top: AXIS_H + lane * LANE_H + 6, height: LANE_H - 12, width: w }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scroll left for earlier · tap a block to edit · red line = now</p>

      {selected && (
        <EditEventDialog
          event={selected}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); onChange() }}
        />
      )}
    </div>
  )
}
