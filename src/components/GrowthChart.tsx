'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ageSinceBirth, type AgeUnit } from '@/lib/domain/age'
import type { BabyEvent } from '@/lib/domain/types'

export function GrowthChart({ events, dob }: { events: BabyEvent[]; dob: string }) {
  const [unit, setUnit] = useState<AgeUnit>('weeks')
  const stats = events.filter((e) => e.type === 'body_stat')
  const data = stats
    .map((e) => ({
      age: ageSinceBirth(dob, e.occurred_at, unit),
      weight: e.stat_type === 'weight' ? e.stat_value : null,
      height: e.stat_type === 'height' ? e.stat_value : null,
    }))
    .sort((a, b) => a.age - b.age)

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Growth</h1>
      <div className="flex gap-2 mb-3">
        {(['days', 'weeks', 'months'] as const).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={`flex-1 rounded-lg border p-2 capitalize ${unit === u ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
          >
            {u}
          </button>
        ))}
      </div>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No weight or height logged yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 16, left: 0 }}>
            <XAxis dataKey="age" label={{ value: unit, position: 'insideBottom', offset: -8 }} />
            <YAxis yAxisId="w" orientation="left" />
            <YAxis yAxisId="h" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="w" type="monotone" dataKey="weight" name="Weight (kg)" connectNulls stroke="#000" />
            <Line yAxisId="h" type="monotone" dataKey="height" name="Height (cm)" connectNulls stroke="#888" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
