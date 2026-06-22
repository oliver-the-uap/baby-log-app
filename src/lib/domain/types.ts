export type EventType = 'nappy' | 'potty' | 'bath' | 'feed' | 'sleep' | 'body_stat' | 'vitamin_d'
export type NappyContents = 'wee' | 'poo' | 'both'
export type FeedMethod = 'breast' | 'bottle'
export type BreastSide = 'left' | 'right' | 'both'
export type StatType = 'weight' | 'height' | 'head'
export type WashKind = 'bath' | 'shower'

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
  sleep_ended_at: string | null
  bottle_amount_ml: number | null
  stat_type: StatType | null
  stat_value: number | null
  wash_kind: WashKind | null
}
