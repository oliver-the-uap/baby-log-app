'use client'
import { useState } from 'react'
import { createEvent } from '@/lib/data/events'
import { notifyError } from '@/lib/notify'
import type { StatType } from '@/lib/domain/types'
import { Sheet } from './Sheet'

export function BodyStatDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [statType, setStatType] = useState<StatType>('weight')
  const [value, setValue] = useState('')

  async function save() {
    const v = parseFloat(value)
    if (Number.isNaN(v) || v <= 0) {
      notifyError(new Error('Enter a valid number.'))
      return
    }
    try {
      await createEvent({ type: 'body_stat', stat_type: statType, stat_value: v })
      onDone()
    } catch (e) {
      notifyError(e)
    }
  }

  return (
    <Sheet title="Body stat" onClose={onClose}>
      <div className="flex gap-2 mb-3">
        {(['weight', 'height', 'head'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setStatType(t)}
            className={`flex-1 rounded-lg border p-2 capitalize ${statType === t ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        className="w-full border rounded-lg p-3"
        inputMode="decimal"
        placeholder={statType === 'weight' ? 'kg' : 'cm'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button onClick={save} className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg p-3 mt-3">
        Save
      </button>
    </Sheet>
  )
}
