import type { BabyEvent } from './types'

export function eventSummary(e: BabyEvent): string {
  switch (e.type) {
    case 'nappy': {
      const m = { wee: 'wee', poo: 'poo', both: 'wee & poo' } as const
      return `Nappy — ${m[e.nappy_contents ?? 'wee']}`
    }
    case 'bath':
      return 'Bath'
    case 'feed':
      if (e.feed_method === 'breast') return `Feed — ${e.breast_side} breast`
      return e.bottle_amount_ml != null ? `Feed — bottle, ${e.bottle_amount_ml}ml` : 'Feed — bottle'
    case 'body_stat': {
      const unit = e.stat_type === 'weight' ? 'kg' : 'cm'
      const label = e.stat_type === 'weight' ? 'Weight' : 'Height'
      return `${label} — ${e.stat_value} ${unit}`
    }
  }
}
