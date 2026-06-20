import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegisterSW } from '@/components/RegisterSW'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="min-h-dvh pb-16">
      <RegisterSW />
      {children}
      <nav className="fixed bottom-0 inset-x-0 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 grid grid-cols-3 text-center text-sm">
        <Link className="py-3" href="/">Log</Link>
        <Link className="py-3" href="/growth">Growth</Link>
        <Link className="py-3" href="/settings">Settings</Link>
      </nav>
    </div>
  )
}
