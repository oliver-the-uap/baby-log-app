export type EventType = 'nappy' | 'bath' | 'feed' | 'body_stat'
export type NappyContents = 'wee' | 'poo' | 'both'
export type FeedMethod = 'breast' | 'bottle'
export type BreastSide = 'left' | 'right' | 'both'
export type StatType = 'weight' | 'height'

export interface BabyEvent {
  id: string
  type: EventType
  occurred_at: string // ISO timestamp
  created_by: string
  created_at: string
  nappy_contents: NappyContents | null
  feed_method: FeedMethod | null
  breast_side: BreastSide | null
  feed_ended_at: string | null
  bottle_amount_ml: number | null
  stat_type: StatType | null
  stat_value: number | null
}
