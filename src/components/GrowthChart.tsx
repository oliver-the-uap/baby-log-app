'use client'
import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Customized,
  usePlotArea,
  useYAxisScale,
} from 'recharts'
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

// Draw the centile numbers at the right end of each line (printed-chart style),
// using the chart's real y-scale + plot area so they sit exactly on their lines.
function CentileLabels({ lastRow }: { lastRow?: Row }) {
  const plot = usePlotArea()
  const yScale = useYAxisScale()
  if (!plot || !yScale || !lastRow) return null
  const xRight = plot.x + plot.width
  return (
    <g>
      {RED_BOOK_CENTILES.map((c, i) => {
        const v = lastRow[`c${i}`]
        if (v == null) return null
        const y = Number(yScale(v))
        if (Number.isNaN(y)) return null
        return (
          <text
            key={c.label}
            x={xRight + 3}
            y={y}
            dy={3}
            fontSize={9}
            fill={i === MEDIAN_INDEX ? '#475569' : '#94a3b8'}
          >
            {c.label.replace(/\D/g, '')}
          </text>
        )
      })}
    </g>
  )
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
                tooltipType="none"
              />
            ))}
          <Line dataKey="value" name={title} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          {hasRef && <Customized component={() => <CentileLabels lastRow={data[data.length - 1]} />} />}
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
