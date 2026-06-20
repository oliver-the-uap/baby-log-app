import type { BabyEvent, NappyContents } from './types'

function contentsLabel(c: NappyContents | null): string {
  const m = { wee: 'wee', poo: 'poo', both: 'wee & poo' } as const
  return m[c ?? 'wee']
}

export function eventSummary(e: BabyEvent): string {
  switch (e.type) {
    case 'nappy':
      return `Nappy — ${contentsLabel(e.nappy_contents)}`
    case 'potty':
      return `Potty — ${contentsLabel(e.nappy_contents)}`
    case 'bath':
      return 'Bath'
    case 'feed':
      if (e.feed_method === 'breast') {
        return e.breast_side ? `Feed — ${e.breast_side} breast` : 'Feed — breast'
      }
      return e.bottle_amount_ml != null ? `Feed — bottle, ${e.bottle_amount_ml}ml` : 'Feed — bottle'
    case 'body_stat': {
      const unit = e.stat_type === 'weight' ? 'kg' : 'cm'
      const label = e.stat_type === 'weight' ? 'Weight' : 'Height'
      return `${label} — ${e.stat_value} ${unit}`
    }
  }
}
