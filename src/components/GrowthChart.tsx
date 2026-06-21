'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { AgeUnit } from '@/lib/domain/age'
import { centileSeries, RED_BOOK_CENTILES, MEDIAN_INDEX, type Sex, type Measure } from '@/lib/domain/growthReference'
import type { BabyEvent } from '@/lib/domain/types'

const DPM = 30.4375
const UNITS: AgeUnit[] = ['days', 'weeks', 'months']

const monthToUnit = (m: number, unit: AgeUnit) =>
  unit === 'days' ? m * DPM : unit === 'weeks' ? (m * DPM) / 7 : m
const ageInUnit = (occ: string, dob: string, unit: AgeUnit) => {
  const days = (new Date(occ).getTime() - new Date(dob).getTime()) / 86_400_000
  return unit === 'days' ? days : unit === 'weeks' ? days / 7 : days / DPM
}

type Row = { age: number; value?: number; [k: string]: number | undefined }

// Render a small centile number at the line's rightmost point (printed-chart style).
// Typed as `any` because Recharts' label content signature is awkward to satisfy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rightLabel(text: string, lastIndex: number, emphasized: boolean): any {
  return (p: { x?: number; y?: number; index?: number }) =>
    p.index === lastIndex && p.x != null && p.y != null ? (
      <text x={p.x + 4} y={p.y} dy={3} fontSize={9} fill={emphasized ? '#475569' : '#94a3b8'}>
        {text}
      </text>
    ) : null
}

function MeasureChart({
  title,
  unit,
  color,
  data,
  hasRef,
}: {
  title: string
  unit: AgeUnit
  color: string
  data: Row[]
  hasRef: boolean
}) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium mb-1">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 8, right: 30, bottom: 16, left: 0 }}>
          <XAxis
            dataKey="age"
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(v) => `${Math.round(v)}`}
            tick={{ fontSize: 11 }}
            label={{ value: unit, position: 'insideBottom', offset: -8, fontSize: 11 }}
          />
          <YAxis width={36} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => (typeof value === 'number' ? value.toFixed(2) : String(value))}
            labelFormatter={(v) => `${Math.round(Number(v))} ${unit}`}
          />
          {hasRef &&
            RED_BOOK_CENTILES.map((c, i) => (
              <Line
                key={c.label}
                dataKey={`c${i}`}
                name={c.label}
                stroke={i === MEDIAN_INDEX ? '#64748b' : '#cbd5e1'}
                strokeWidth={i === MEDIAN_INDEX ? 1.5 : 1}
                dot={false}
                connectNulls
                isAnimationActive={false}
                label={rightLabel(c.label.replace(/\D/g, ''), data.length - 1, i === MEDIAN_INDEX)}
              />
            ))}
          <Line dataKey="value" name={title} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GrowthChart({ events, dob, sex }: { events: BabyEvent[]; dob: string; sex: Sex | null }) {
  const [unit, setUnit] = useState<AgeUnit>('weeks')

  function build(measure: Measure): Row[] {
    const meas = events
      .filter((e) => e.stat_type === measure && e.stat_value != null)
      .map((e) => ({
        age: ageInUnit(e.occurred_at, dob, unit),
        ageMonths: ageInUnit(e.occurred_at, dob, 'months'),
        value: e.stat_value as number,
      }))
    const maxM = meas.length ? Math.max(...meas.map((p) => p.ageMonths)) : 0
    const domMonths = Math.min(24, Math.max(2, Math.ceil(maxM) + 1))
    const ref: Row[] = []
    if (sex) {
      const series = centileSeries(sex, measure)
      for (let m = 0; m <= domMonths; m++) {
        const row: Row = { age: monthToUnit(m, unit) }
        series.forEach((s, i) => {
          row[`c${i}`] = s.byMonth[m]
        })
        ref.push(row)
      }
    }
    return [...ref, ...meas.map((p) => ({ age: p.age, value: p.value }))].sort((a, b) => a.age - b.age)
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Growth</h1>
      <div className="flex gap-2 mb-4">
        {UNITS.map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={`flex-1 rounded-lg border p-2 capitalize ${
              unit === u ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''
            }`}
          >
            {u}
          </button>
        ))}
      </div>

      {!sex && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Set the baby&apos;s sex in Settings to overlay the NHS Red Book centiles.
        </p>
      )}

      <MeasureChart title="Weight (kg)" unit={unit} color="#0d9488" data={build('weight')} hasRef={!!sex} />
      <MeasureChart title="Height (cm)" unit={unit} color="#4f46e5" data={build('height')} hasRef={!!sex} />
      <MeasureChart title="Head circ (cm)" unit={unit} color="#db2777" data={build('head')} hasRef={!!sex} />

      {sex && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Grey lines: NHS Red Book (UK-WHO) centiles — 2nd / 9th / 25th / 50th / 75th / 91st / 98th
          (darker = 50th), {sex}.
        </p>
      )}
    </div>
  )
}
