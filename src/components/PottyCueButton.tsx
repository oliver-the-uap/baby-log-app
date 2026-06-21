'use client'
import { useEffect, useRef, useState } from 'react'
import { buildCueBuffer } from '@/lib/audio/pottyCue'

export function PottyCueButton() {
  const ctxRef = useRef<AudioContext | null>(null)
  const srcRef = useRef<AudioBufferSourceNode | null>(null)
  const bufRef = useRef<AudioBuffer | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)

  // stop + tidy up if the dialog closes while playing
  useEffect(() => {
    return () => {
      try {
        srcRef.current?.stop()
      } catch {
        /* already stopped */
      }
      ctxRef.current?.close().catch(() => {})
    }
  }, [])

  async function start() {
    setLoading(true)
    try {
      const Ctx =
        (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = ctxRef.current ?? new Ctx()
      ctxRef.current = ctx
      await ctx.resume()
      if (!bufRef.current) bufRef.current = await buildCueBuffer(ctx.sampleRate)
      const src = ctx.createBufferSource()
      src.buffer = bufRef.current
      src.loop = true
      src.connect(ctx.destination)
      src.start()
      srcRef.current = src
      setPlaying(true)
    } catch {
      /* audio unavailable */
    } finally {
      setLoading(false)
    }
  }

  function stop() {
    try {
      srcRef.current?.stop()
      srcRef.current?.disconnect()
    } catch {
      /* already stopped */
    }
    srcRef.current = null
    setPlaying(false)
  }

  return (
    <button
      type="button"
      onClick={playing ? stop : start}
      className={`w-full rounded-lg border p-3 mb-3 ${
        playing ? 'bg-emerald-600 text-white border-emerald-600' : ''
      }`}
    >
      {loading ? 'Starting…' : playing ? '⏹ Stop cue sound' : '🔊 Play cue sound'}
    </button>
  )
}
