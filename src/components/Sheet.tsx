'use client'

export function Sheet({
  title,
  onClose,
  children,
  headerRight,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  headerRight?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white dark:bg-neutral-900 rounded-t-2xl p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {headerRight ?? (
            <button onClick={onClose} className="text-gray-500 dark:text-gray-400 text-sm">
              Cancel
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
