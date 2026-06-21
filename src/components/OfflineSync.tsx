'use client'
import { useEffect } from 'react'
import { flushOutbox } from '@/lib/offline/sync'

// Flushes any writes that were queued offline: once on load, and again whenever
// the device comes back online.
export function OfflineSync() {
  useEffect(() => {
    flushOutbox()
    const onOnline = () => flushOutbox()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])
  return null
}
