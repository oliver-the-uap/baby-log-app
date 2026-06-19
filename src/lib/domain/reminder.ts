export function isFeedOverdue(lastFeedAt: string | null, hours: number, now: Date): boolean {
  if (!lastFeedAt) return false
  const diffH = (now.getTime() - new Date(lastFeedAt).getTime()) / 3_600_000
  return diffH > hours
}

export function shouldSendReminder(
  s: { overdue: boolean; lastSentAt: string | null; lastFeedAt: string | null },
  now: Date,
): boolean {
  if (!s.overdue) return false
  if (!s.lastSentAt) return true
  // Resend if the last reminder predates the current feed window, or >1h since last reminder.
  if (s.lastFeedAt && new Date(s.lastSentAt) < new Date(s.lastFeedAt)) return true
  return now.getTime() - new Date(s.lastSentAt).getTime() > 3_600_000
}
