'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSettings, updateSettings } from '@/lib/data/settings'
import { getBaby, updateBaby } from '@/lib/data/baby'
import { createClient } from '@/lib/supabase/client'
import { notifyError } from '@/lib/notify'
import { NotificationToggle } from '@/components/NotificationToggle'
import type { Sex } from '@/lib/domain/growthReference'

const PRIMARY = 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'

export default function SettingsPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState<Sex | null>(null)
  const [enabled, setEnabled] = useState(true)
  const [hours, setHours] = useState(4)
  const [weightOn, setWeightOn] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getBaby()
      .then((b) => { setName(b.name); setDob(b.date_of_birth); setSex(b.gender) })
      .catch(notifyError)
    getSettings()
      .then((s) => {
        setEnabled(s.feed_reminder_enabled)
        setHours(Number(s.feed_reminder_hours))
        setWeightOn(s.weight_reminder_enabled)
      })
      .catch(notifyError)
  }, [])

  async function save() {
    try {
      await updateBaby({ name, date_of_birth: dob, gender: sex })
      await updateSettings({
        feed_reminder_enabled: enabled,
        feed_reminder_hours: hours,
        weight_reminder_enabled: weightOn,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      notifyError(e)
    }
  }
  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  return (
    <main className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="space-y-3">
        <h2 className="font-medium">Baby</h2>
        <label className="block">
          <span className="text-sm">Name</span>
          <input className="mt-1 w-full border rounded-lg p-3" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">Date of birth</span>
          <input type="date" className="mt-1 w-full border rounded-lg p-3" value={dob} onChange={(e) => setDob(e.target.value)} />
        </label>
        <div>
          <span className="text-sm">Sex</span>
          <div className="mt-1 flex gap-2">
            {(['girl', 'boy'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={`flex-1 rounded-lg border p-2 capitalize ${sex === s ? PRIMARY : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Used to plot WHO / NHS growth centiles on the growth charts.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Feed reminder</h2>
        <label className="flex items-center justify-between">
          <span>Feed reminder</span>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between">
          <span>Remind after (hours)</span>
          <input
            type="number"
            min={1}
            step={0.5}
            className="border rounded-lg p-2 w-24"
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value))}
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Weight reminder</h2>
        <label className="flex items-center justify-between">
          <span>Weigh-in reminder</span>
          <input type="checkbox" checked={weightOn} onChange={(e) => setWeightOn(e.target.checked)} />
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Reminds you to log a weight every 4 days until 12 weeks, then weekly for the rest of the first year.
        </p>
      </section>

      <button onClick={save} className={`w-full rounded-lg p-3 ${PRIMARY}`}>
        {saved ? 'Saved ✓' : 'Save'}
      </button>

      <NotificationToggle />

      <button onClick={signOut} className="w-full border rounded-lg p-3">
        Sign out
      </button>
    </main>
  )
}
