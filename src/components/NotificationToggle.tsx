'use client'
import { useState } from 'react'
import { saveSubscription } from '@/lib/data/push'
import { notifyError } from '@/lib/notify'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function NotificationToggle() {
  const [status, setStatus] = useState('')

  async function enable() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('Push not supported on this browser')
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setStatus('Permission denied')
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      await saveSubscription(sub.toJSON())
      setStatus('Notifications enabled on this device')
    } catch (e) {
      notifyError(e)
    }
  }

  return (
    <div>
      <button onClick={enable} className="w-full border rounded-lg p-3">
        Enable notifications on this device
      </button>
      {status && <p className="text-sm text-gray-600 mt-2">{status}</p>}
    </div>
  )
}
