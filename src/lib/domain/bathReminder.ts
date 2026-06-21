const DAY = 86_400_000
export const BATH_INTERVAL_DAYS = 3

export function isBathDue(lastBathAt: string | null, dob: string, now: Date): boolean {
  // count from the last bath, or from birth if none has been logged yet
  const ref = lastBathAt ? new Date(lastBathAt).getTime() : new Date(dob).getTime()
  return (now.getTime() - ref) / DAY >= BATH_INTERVAL_DAYS
}

export function shouldSendBathReminder(
  s: { due: boolean; lastSentAt: string | null; lastBathAt: string | null },
  now: Date,
): boolean {
  if (!s.due) return false
  if (!s.lastSentAt) return true
  // a bath logged since the last reminder resets the cycle
  if (s.lastBathAt && new Date(s.lastSentAt) < new Date(s.lastBathAt)) return true
  // otherwise re-remind at most once a day while still due
  return now.getTime() - new Date(s.lastSentAt).getTime() > DAY
}
