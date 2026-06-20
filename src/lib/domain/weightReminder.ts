const DAY = 86_400_000

// How often to weigh, by age: every 4 days until 12 weeks, then weekly until
// the first birthday, then stop reminding.
export function weightIntervalDays(ageDays: number): number | null {
  const weeks = ageDays / 7
  if (weeks < 12) return 4
  if (weeks < 52) return 7
  return null
}

export function isWeightDue(lastWeightAt: string | null, dob: string, now: Date): boolean {
  const interval = weightIntervalDays((now.getTime() - new Date(dob).getTime()) / DAY)
  if (interval == null) return false
  const ref = lastWeightAt ? new Date(lastWeightAt).getTime() : new Date(dob).getTime()
  return (now.getTime() - ref) / DAY >= interval
}

export function shouldSendWeightReminder(
  s: { due: boolean; lastSentAt: string | null; lastWeightAt: string | null },
  now: Date,
): boolean {
  if (!s.due) return false
  if (!s.lastSentAt) return true
  // a new weight since the last reminder resets the cycle
  if (s.lastWeightAt && new Date(s.lastSentAt) < new Date(s.lastWeightAt)) return true
  // otherwise re-remind at most once per day while still due
  return now.getTime() - new Date(s.lastSentAt).getTime() > DAY
}
