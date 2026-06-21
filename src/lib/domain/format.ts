import type { BabyEvent, NappyContents } from './types'
import { feedDurationMinutes } from './feed'
import { sleepDurationMinutes } from './sleep'

function contentsLabel(c: NappyContents | null): string {
  const m = { wee: 'wee', poo: 'poo', both: 'wee & poo' } as const
  return m[c ?? 'wee']
}

// " (25 mins)" for a completed feed; "" while in progress or zero-length.
function durationSuffix(e: BabyEvent): string {
  const mins = feedDurationMinutes(e)
  if (mins == null || mins <= 0) return ''
  return ` (${mins} min${mins === 1 ? '' : 's'})`
}

export function eventSummary(e: BabyEvent): string {
  switch (e.type) {
    case 'nappy':
      return `Nappy — ${contentsLabel(e.nappy_contents)}`
    case 'potty':
      return `Potty — ${contentsLabel(e.nappy_contents)}`
    case 'bath':
      return 'Bath'
    case 'sleep': {
      const mins = sleepDurationMinutes(e)
      if (mins == null || mins <= 0) return 'Sleep'
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `Sleep — ${h > 0 ? `${h}h ` : ''}${m}m`
    }
    case 'feed': {
      const dur = durationSuffix(e)
      if (e.feed_method === 'breast') {
        return e.breast_side ? `Feed — ${e.breast_side} breast${dur}` : `Feed — breast${dur}`
      }
      const amount = e.bottle_amount_ml != null ? `, ${e.bottle_amount_ml}ml` : ''
      return `Feed — bottle${amount}${dur}`
    }
    case 'body_stat': {
      const unit = e.stat_type === 'weight' ? 'kg' : 'cm'
      const label =
        e.stat_type === 'weight' ? 'Weight' : e.stat_type === 'head' ? 'Head circ' : 'Height'
      return `${label} — ${e.stat_value} ${unit}`
    }
  }
}
