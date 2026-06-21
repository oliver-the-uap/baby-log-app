'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ShowToast = (message: string, undo?: () => void | Promise<void>) => void
const ToastCtx = createContext<ShowToast>(() => {})

export function useToast(): ShowToast {
  return useContext(ToastCtx)
}

type Toast = { id: number; message: string; undo?: () => void | Promise<void> }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)

  const show = useCallback<ShowToast>((message, undo) => {
    if (timer.current) clearTimeout(timer.current)
    const id = ++seq.current
    setToast({ id, message, undo })
    timer.current = setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 5000)
  }, [])

  async function runUndo() {
    if (timer.current) clearTimeout(timer.current)
    const u = toast?.undo
    setToast(null)
    if (u) await u()
  }

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 px-4 py-2.5 text-sm shadow-lg">
            <span>{toast.message}</span>
            {toast.undo && (
              <button onClick={runUndo} className="font-semibold underline shrink-0">
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}
