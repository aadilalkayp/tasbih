export type Dhikr = {
  id: string
  name: string
  arabic: string
  meaning: string
  target: number
}

export type SequenceStep = { dhikrId: string; target: number }

export type Sequence = {
  id: string
  name: string
  steps: SequenceStep[]
}

export type Active = { kind: 'dhikr'; id: string } | { kind: 'sequence'; id: string }

export type Settings = {
  sound: boolean
  haptics: boolean
  /** Ignore mouse / trackpad clicks on the counter; keyboard and touch still count. */
  ignorePointer: boolean
  /** Counts arriving faster than this after the previous one are dropped. */
  cooldownMs: number
}

export type State = {
  version: 1
  dhikrs: Dhikr[]
  sequences: Sequence[]
  /** Current count per dhikr (single-dhikr mode). */
  counts: Record<string, number>
  /** Position within each sequence. */
  seqProgress: Record<string, { step: number; count: number }>
  active: Active | null
  settings: Settings
  /** YYYY-MM-DD -> dhikrId -> number of counts that day. */
  log: Record<string, Record<string, number>>
}

export type FeedbackEvent = 'tick' | 'step' | 'complete'
