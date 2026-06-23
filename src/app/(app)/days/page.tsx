'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
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
const NAPPY = '#f59e0b'
const SLEEP_RGB = '124, 58, 237'
const FEED_RGB = '13, 148, 136'
const NAPPY_RGB = '245, 158, 11'
const TRACK = 'rgba(120, 120, 120, 0.15)'

// Scatter marker: filled dot, except today (partial) which is a hollow ring.
// Points with no value (e.g. 0-sleep days passed as null) have null cx/cy — skip them.
const dot = (color: string) => (props: { cx?: number; cy?: number; index?: number; payload?: { today?: boolean } }) => {
  const { cx, cy, index, payload } = props
  if (cx == null || cy == null) return <g key={index} />
  return payload?.today ? (
    <circle key={index} cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={2.5} />
  ) : (
    <circle key={index} cx={cx} cy={cy} r={3.5} fill={color} />
  )
}

const hm = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h > 0 ? `${h}h ` : ''}${m}m`
}

// Two independent rings: sleep and feed are each a share of the day's elapsed
// time, drawn separately because they can overlap (she can feed while asleep).
const ring = (filled: number, elapsed: number, fill: string) => [
  { v: Math.max(0, filled), fill },
  { v: Math.max(0, elapsed - filled), fill: TRACK },
]

type Day = { back: number; dayStart: number; agg: DayAgg }

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

  // GitHub-style grid: weekday rows (Sun→Sat) × week columns, oldest week left.
  const heat = useMemo(() => {
    if (!days.length) return { weeks: [] as ({ t: number; agg: DayAgg | null } | null)[][], maxSleep: 1, maxFeed: 1, maxChange: 1 }
    const aggByDay = new Map(days.map((d) => [d.dayStart, d.agg]))
    const todayStart = days[0].dayStart
    const start = new Date(days[days.length - 1].dayStart)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - start.getDay()) // back to Sunday
    let maxSleep = 1
    let maxFeed = 1
    let maxChange = 1
    const weeks: ({ t: number; agg: DayAgg | null } | null)[][] = []
    const c = new Date(start)
    while (c.getTime() <= todayStart) {
      const week: ({ t: number; agg: DayAgg | null } | null)[] = []
      for (let wd = 0; wd < 7; wd++) {
        const t = new Date(c)
        t.setHours(0, 0, 0, 0)
        const agg = aggByDay.get(t.getTime()) ?? null
        if (agg) {
          maxSleep = Math.max(maxSleep, agg.sleeps)
          maxFeed = Math.max(maxFeed, agg.feeds)
          maxChange = Math.max(maxChange, agg.changes)
        }
        week.push(t.getTime() > todayStart ? null : { t: t.getTime(), agg })
        c.setDate(c.getDate() + 1)
      }
      weeks.push(week)
    }
    return { weeks, maxSleep, maxFeed, maxChange }
  }, [days])

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
      sleepH: d.agg.sleepMin > 0 ? +(d.agg.sleepMin / 60).toFixed(1) : null,
      feeds: d.agg.feeds,
      changes: d.agg.changes,
      today: d.back === 0,
    }))

  return (
    <main className="p-4 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Days</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          A few ways to compare days — tell me which you like and I&apos;ll keep that one.
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

      {/* OPTION B — twin-ring donuts (sleep + feed), counts in the middle */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Option B · Sleep & feed rings
        </h2>
        <div className="rounded-xl border p-3 space-y-2">
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: SLEEP }} /> Sleep (outer)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: FEED }} /> Feeds (inner)
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {donutDays.map((d) => (
              <div key={d.back} className="shrink-0 w-[72px] text-center">
                <div className="relative" style={{ height: 72 }}>
                  <ResponsiveContainer width="100%" height={72}>
                    <PieChart>
                      <Pie
                        data={ring(d.agg.sleepMin, d.agg.elapsedMin, SLEEP)}
                        dataKey="v"
                        innerRadius={25}
                        outerRadius={33}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {ring(d.agg.sleepMin, d.agg.elapsedMin, SLEEP).map((s, i) => (
                          <Cell key={i} fill={s.fill} />
                        ))}
                      </Pie>
                      <Pie
                        data={ring(d.agg.feedMin, d.agg.elapsedMin, FEED)}
                        dataKey="v"
                        innerRadius={14}
                        outerRadius={22}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {ring(d.agg.feedMin, d.agg.elapsedMin, FEED).map((s, i) => (
                          <Cell key={i} fill={s.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                    <span className="text-[11px] font-bold" style={{ color: SLEEP }}>{d.agg.sleeps}</span>
                    <span className="text-[11px] font-bold" style={{ color: FEED }}>{d.agg.feeds}</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  {d.back === 0
                    ? 'Today'
                    : new Date(d.dayStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Ring fill = share of the day · centre numbers = sleep / feed counts · scroll for earlier · today is partial.
          </p>
        </div>
      </section>

      {/* OPTION C — two-week scatter, dual y-axis */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Option C · Two-week trends
        </h2>
        <div className="rounded-xl border p-3 space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: SLEEP }} /> Sleep hours
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: FEED }} /> Feeds
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: NAPPY }} /> Nappies/potties
            </span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <ScatterChart data={trend} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
              <XAxis dataKey="label" type="category" tick={{ fontSize: 9 }} interval={0} />
              <YAxis yAxisId="sleep" type="number" width={26} tick={{ fontSize: 9, fill: SLEEP }} />
              <YAxis yAxisId="count" type="number" orientation="right" width={22} tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v, name) => (name === 'Sleep hours' ? [`${v} h`, name] : [`${v}`, name])}
              />
              <Scatter yAxisId="sleep" dataKey="sleepH" name="Sleep hours" shape={dot(SLEEP)} isAnimationActive={false} />
              <Scatter yAxisId="count" dataKey="feeds" name="Feeds" shape={dot(FEED)} isAnimationActive={false} />
              <Scatter yAxisId="count" dataKey="changes" name="Nappies/potties" shape={dot(NAPPY)} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Left axis = sleep hours · right axis = counts · hollow marker = today (partial) · 0-sleep days omitted.
          </p>
        </div>
      </section>

      {/* OPTION D — GitHub-style activity heatmaps */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Option D · Activity heatmap
        </h2>
        <div className="rounded-xl border p-3 space-y-4">
          <HeatGrid title="Sleeps / day" unit="sleeps" weeks={heat.weeks} max={heat.maxSleep} rgb={SLEEP_RGB} pick={(a) => a.sleeps} />
          <HeatGrid title="Feeds / day" unit="feeds" weeks={heat.weeks} max={heat.maxFeed} rgb={FEED_RGB} pick={(a) => a.feeds} />
          <HeatGrid title="Nappies/potties / day" unit="changes" weeks={heat.weeks} max={heat.maxChange} rgb={NAPPY_RGB} pick={(a) => a.changes} />
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Each square = a day · darker = more · tap a square to see the count above.
          </p>
        </div>
      </section>
    </main>
  )
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function HeatGrid({
  title,
  unit,
  weeks,
  max,
  rgb,
  pick,
}: {
  title: string
  unit: string
  weeks: ({ t: number; agg: DayAgg | null } | null)[][]
  max: number
  rgb: string
  pick: (a: DayAgg) => number
}) {
  const [picked, setPicked] = useState<{ t: number; count: number } | null>(null)
  const shade = (n: number) => (n === 0 ? 'rgba(120,120,120,0.12)' : `rgba(${rgb}, ${0.25 + 0.75 * (n / max)})`)
  const readout = picked
    ? `${new Date(picked.t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${picked.count} ${unit}`
    : 'tap a day'
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-300">{title}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{readout}</span>
      </div>
      <div className="flex gap-[3px]">
        <div className="flex flex-col gap-[3px] mr-1">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[8px] leading-3 h-3 text-gray-400 dark:text-gray-500">
              {i % 2 ? w : ''}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) => {
              if (!cell || !cell.agg) return <span key={di} className="w-3 h-3" />
              const count = pick(cell.agg)
              const isSel = picked?.t === cell.t
              return (
                <button
                  key={di}
                  type="button"
                  onClick={() => setPicked({ t: cell.t, count })}
                  className={`w-3 h-3 rounded-sm ${isSel ? 'ring-2 ring-gray-500 dark:ring-gray-300' : ''}`}
                  style={{ background: shade(count) }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
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
