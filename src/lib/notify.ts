// Minimal user-facing error surface so failed actions are never silent.
export function notifyError(e: unknown): void {
  const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
  if (typeof window !== 'undefined') window.alert(msg)
}
