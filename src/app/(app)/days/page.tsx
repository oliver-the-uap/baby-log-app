'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { allEventsForChart } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import { aggregateDay, localMidnight, type DayAgg } from '@/lib/domain/dayStats'
import type { BabyEvent } from '@/lib/domain/types'

const SLEEP = '#7c3aed'
const FEED = '#0d9488'
const AWAKE = '#cbd5e1'

const hm = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h > 0 ? `${h}h ` : ''}${m}m`
}
const splitData = (a: DayAgg) => [
  { name: 'Sleep', value: a.sleepMin, fill: SLEEP },
  { name: 'Feeding', value: a.feedMin, fill: FEED },
  { name: 'Awake', value: a.awakeRestMin, fill: AWAKE },
]

type Day = { back: number; dayStart: number; agg: DayAgg }

function Legend() {
  return (
    <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-300">
      {[
        ['Sleep', SLEEP],
        ['Feeding', FEED],
        ['Awake', AWAKE],
      ].map(([label, c]) => (
        <span key={label} className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c as string }} />
          {label}
        </span>
      ))}
    </div>
  )
}

export default function DaysPage() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [now] = useState(() => Date.now())
  const [sel, setSel] = useState(0) // days back, for Option A

  useEffect(() => {
    allEventsForChart().then(setEvents).catch(notifyError)
  }, [])

  const { days, maxBack } = useMemo(() => {
    const earliest = events.length ? new Date(events[0].occurred_at).getTime() : now
    const span = Math.max(0, Math.floor((now - earliest) / 86_400_000))
    const maxBack = Math.min(60, span)
    const days: Day[] = []
    for (let back = 0; back <= maxBack; back++) {
      const dayStart = localMidnight(back)
      const dayEnd = localMidnight(back - 1)
      days.push({ back, dayStart, agg: aggregateDay(events, dayStart, dayEnd, now) })
    }
    return { days, maxBack }
  }, [events, now])

  if (!days.length) return <main className="p-4">Loading…</main>

  const cur = days[Math.min(sel, days.length - 1)]
  const relLabel = sel === 0 ? 'Today' : sel === 1 ? 'Yesterday' : null
  const dateLabel = new Date(cur.dayStart).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const donutDays = days.slice(0, 10).reverse()
  const trend = days
    .slice(0, 14)
    .reverse()
    .map((d) => ({
      label: new Date(d.dayStart).toLocaleDateString(undefined, { day: 'numeric', month: 'numeric' }),
      sleepH: +(d.agg.sleepMin / 60).toFixed(1),
      feeds: d.agg.feeds,
    }))

  return (
    <main className="p-4 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Days</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Three ways to compare days — tell me which you like and I&apos;ll keep that one.
        </p>
      </div>

      {/* OPTION A — scrollable day summary */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Option A · Flip through days
        </h2>
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setSel((s) => Math.min(maxBack, s + 1))}
              disabled={sel >= maxBack}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-30"
              aria-label="Previous day"
            >
              ←
            </button>
            <div className="text-center">
              <div className="font-medium">{relLabel ?? dateLabel}</div>
              {relLabel && <div className="text-xs text-gray-500 dark:text-gray-400">{dateLabel}</div>}
            </div>
            <button
              onClick={() => setSel((s) => Math.max(0, s - 1))}
              disabled={sel === 0}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-30"
              aria-label="Next day"
            >
              →
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Row label="Slept" value={hm(cur.agg.sleepMin)} />
            <Row label="Feeding" value={hm(cur.agg.feedMin)} />
            <Row label="Awake" value={hm(cur.agg.awakeRestMin)} />
            <Row label="Feeds" value={String(cur.agg.feeds)} />
            <Row label="Changes" value={String(cur.agg.changes)} />
            <Row label="Washes" value={String(cur.agg.washes)} />
            <Row label="Vitamin D" value={cur.agg.vitd ? '✓' : '—'} />
          </dl>
        </div>
      </section>

      {/* OPTION B — daily time-split donuts */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Option B · Time-split donuts
        </h2>
        <div className="rounded-xl border p-3 space-y-2">
          <Legend />
          <div className="flex gap-3 overflow-x-auto pb-1">
            {donutDays.map((d) => (
              <div key={d.back} className="shrink-0 w-[68px] text-center">
                <ResponsiveContainer width="100%" height={68}>
                  <PieChart>
                    <Pie
                      data={splitData(d.agg)}
                      dataKey="value"
                      innerRadius={18}
                      outerRadius={32}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {splitData(d.agg).map((s) => (
                        <Cell key={s.name} fill={s.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  {d.back === 0
                    ? 'Today'
                    : new Date(d.dayStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </div>
                <div className="text-[10px] font-medium leading-tight">{hm(d.agg.sleepMin)} slp</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Scroll for earlier days · today is partial.</p>
        </div>
      </section>

      {/* OPTION C — two-week trend bars */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Option C · Two-week trends
        </h2>
        <div className="rounded-xl border p-3 space-y-4">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Sleep hours / day</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
                <YAxis width={28} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v) => [`${v} h`, 'Sleep']} />
                <Bar dataKey="sleepH" fill={SLEEP} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Feeds / day</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
                <YAxis width={28} tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}`, 'Feeds']} />
                <Bar dataKey="feeds" fill={FEED} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Left = earlier · rightmost = today (partial).</p>
        </div>
      </section>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}
