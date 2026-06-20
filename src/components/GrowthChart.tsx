'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { AgeUnit } from '@/lib/domain/age'
import { centiles, type Sex, type Measure } from '@/lib/domain/growthReference'
import type { BabyEvent } from '@/lib/domain/types'

const DPM = 30.4375
const UNITS: AgeUnit[] = ['days', 'weeks', 'months']

const monthToUnit = (m: number, unit: AgeUnit) =>
  unit === 'days' ? m * DPM : unit === 'weeks' ? (m * DPM) / 7 : m
const ageInUnit = (occ: string, dob: string, unit: AgeUnit) => {
  const days = (new Date(occ).getTime() - new Date(dob).getTime()) / 86_400_000
  return unit === 'days' ? days : unit === 'weeks' ? days / 7 : days / DPM
}

type Row = { age: number; value?: number; p3?: number; p50?: number; p97?: number }

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
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 16, left: 0 }}>
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
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {hasRef && (
            <>
              <Line dataKey="p97" name="97th" stroke="#cbd5e1" strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />
              <Line dataKey="p50" name="50th" stroke="#94a3b8" dot={false} connectNulls isAnimationActive={false} />
              <Line dataKey="p3" name="3rd" stroke="#cbd5e1" strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />
            </>
          )}
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
    const ref: Row[] = sex
      ? centiles(sex, measure)
          .slice(0, domMonths + 1)
          .map((c) => ({ age: monthToUnit(c.month, unit), p3: c.p3, p50: c.p50, p97: c.p97 }))
      : []
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
          Set the baby&apos;s sex in Settings to overlay WHO / NHS growth centiles.
        </p>
      )}

      <MeasureChart title="Weight (kg)" unit={unit} color="#0d9488" data={build('weight')} hasRef={!!sex} />
      <MeasureChart title="Height (cm)" unit={unit} color="#4f46e5" data={build('height')} hasRef={!!sex} />

      {sex && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Dashed/grey lines: WHO Child Growth Standards 3rd / 50th / 97th centiles ({sex}).
        </p>
      )}
    </div>
  )
}
