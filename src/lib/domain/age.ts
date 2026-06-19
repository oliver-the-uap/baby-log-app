export type AgeUnit = 'days' | 'weeks' | 'months'

export function ageSinceBirth(dob: string, at: string, unit: AgeUnit): number {
  const days = (new Date(at).getTime() - new Date(dob).getTime()) / 86_400_000
  if (unit === 'days') return Math.floor(days)
  if (unit === 'weeks') return Math.floor(days / 7)
  return Math.floor(days / 30.44)
}
