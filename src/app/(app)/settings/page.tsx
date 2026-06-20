'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSettings, updateSettings } from '@/lib/data/settings'
import { createClient } from '@/lib/supabase/client'
import { notifyError } from '@/lib/notify'
import { NotificationToggle } from '@/components/NotificationToggle'

export default function SettingsPage() {
  const router = useRouter()
  const [enabled, setEnabled] = useState(true)
  const [hours, setHours] = useState(4)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings()
      .then((s) => {
        setEnabled(s.feed_reminder_enabled)
        setHours(Number(s.feed_reminder_hours))
      })
      .catch(notifyError)
  }, [])

  async function save() {
    try {
      await updateSettings({ feed_reminder_enabled: enabled, feed_reminder_hours: hours })
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
    <main className="p-4 space-y-5">
      <h1 className="text-xl font-semibold">Settings</h1>

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

      <button onClick={save} className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg p-3">
        {saved ? 'Saved ✓' : 'Save'}
      </button>

      <NotificationToggle />

      <button onClick={signOut} className="w-full border rounded-lg p-3">
        Sign out
      </button>
    </main>
  )
}
