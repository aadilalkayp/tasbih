import { PRESET_DHIKRS, PRESET_SEQUENCES } from './presets'
import type { Dhikr, FeedbackEvent, Sequence, Settings, State } from './types'

const KEY = 'tasbih:v1'
const LOG_DAYS_KEPT = 400

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  ignorePointer: false,
  cooldownMs: 120,
}

export function defaultState(): State {
  return {
    version: 1,
    dhikrs: PRESET_DHIKRS.map((d) => ({ ...d })),
    sequences: PRESET_SEQUENCES.map((s) => ({ ...s, steps: s.steps.map((st) => ({ ...st })) })),
    counts: {},
    seqProgress: {},
    active: { kind: 'dhikr', id: PRESET_DHIKRS[0].id },
    settings: { ...DEFAULT_SETTINGS },
    log: {},
  }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function dayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const posInt = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback

/** Coerces anything (stored or imported) into a valid State, dropping what doesn't fit. */
export function sanitize(raw: unknown): State {
  const base = defaultState()
  if (!isObj(raw)) return base

  const dhikrs: Dhikr[] = Array.isArray(raw.dhikrs)
    ? raw.dhikrs.filter(isObj).flatMap((d) =>
        typeof d.id === 'string' && typeof d.name === 'string'
          ? [
              {
                id: d.id,
                name: d.name,
                arabic: typeof d.arabic === 'string' ? d.arabic : '',
                meaning: typeof d.meaning === 'string' ? d.meaning : '',
                target: Math.max(1, posInt(d.target, 33)),
              },
            ]
          : [],
      )
    : base.dhikrs
  const ids = new Set(dhikrs.map((d) => d.id))

  const sequences: Sequence[] = Array.isArray(raw.sequences)
    ? raw.sequences.filter(isObj).flatMap((s) =>
        typeof s.id === 'string' && typeof s.name === 'string' && Array.isArray(s.steps)
          ? [
              {
                id: s.id,
                name: s.name,
                steps: s.steps
                  .filter(isObj)
                  .filter((st) => typeof st.dhikrId === 'string' && ids.has(st.dhikrId))
                  .map((st) => ({ dhikrId: st.dhikrId as string, target: Math.max(1, posInt(st.target, 33)) })),
              },
            ]
          : [],
      )
    : base.sequences

  const numMap = (v: unknown): Record<string, number> =>
    isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, n]) => [k, posInt(n, 0)])) : {}

  const seqProgress: State['seqProgress'] = {}
  if (isObj(raw.seqProgress)) {
    for (const [k, p] of Object.entries(raw.seqProgress)) {
      if (isObj(p)) seqProgress[k] = { step: posInt(p.step, 0), count: posInt(p.count, 0) }
    }
  }

  const log: State['log'] = {}
  if (isObj(raw.log)) for (const [day, m] of Object.entries(raw.log)) log[day] = numMap(m)

  let active: State['active'] = null
  if (isObj(raw.active) && typeof raw.active.id === 'string') {
    if (raw.active.kind === 'dhikr' || raw.active.kind === 'sequence') active = { kind: raw.active.kind, id: raw.active.id }
  }

  const s = isObj(raw.settings) ? raw.settings : {}
  const settings: Settings = {
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
    haptics: typeof s.haptics === 'boolean' ? s.haptics : DEFAULT_SETTINGS.haptics,
    ignorePointer: typeof s.ignorePointer === 'boolean' ? s.ignorePointer : DEFAULT_SETTINGS.ignorePointer,
    cooldownMs: Math.min(1000, posInt(s.cooldownMs, DEFAULT_SETTINGS.cooldownMs)),
  }

  return { version: 1, dhikrs, sequences, counts: numMap(raw.counts), seqProgress, active, settings, log }
}

export function loadState(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return sanitize(JSON.parse(raw))
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return defaultState()
}

export function saveState(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode / quota: counting still works for this session */
  }
}

// ---------- derived view ----------

export type View = {
  dhikr: Dhikr
  count: number
  target: number
  seq: Sequence | null
  stepIndex: number
}

export function getView(s: State): View | null {
  const a = s.active
  if (!a) return null
  if (a.kind === 'dhikr') {
    const dhikr = s.dhikrs.find((d) => d.id === a.id)
    if (!dhikr) return null
    return { dhikr, count: s.counts[dhikr.id] ?? 0, target: dhikr.target, seq: null, stepIndex: 0 }
  }
  const seq = s.sequences.find((q) => q.id === a.id)
  if (!seq || seq.steps.length === 0) return null
  const p = s.seqProgress[seq.id] ?? { step: 0, count: 0 }
  const stepIndex = Math.min(p.step, seq.steps.length - 1)
  const step = seq.steps[stepIndex]
  const dhikr = s.dhikrs.find((d) => d.id === step.dhikrId)
  if (!dhikr) return null
  return { dhikr, count: p.count, target: step.target, seq, stepIndex }
}

function addLog(log: State['log'], dhikrId: string, delta: number): State['log'] {
  const day = dayKey()
  const today = log[day] ?? {}
  const next = { ...log, [day]: { ...today, [dhikrId]: Math.max(0, (today[dhikrId] ?? 0) + delta) } }
  const days = Object.keys(next)
  if (days.length > LOG_DAYS_KEPT) {
    for (const d of days.sort().slice(0, days.length - LOG_DAYS_KEPT)) delete next[d]
  }
  return next
}

// ---------- transitions ----------

export function increment(s: State): { state: State; event: FeedbackEvent | null } {
  const v = getView(s)
  if (!v) return { state: s, event: null }
  const log = addLog(s.log, v.dhikr.id, 1)
  const c = v.count + 1

  if (!v.seq) {
    return {
      state: { ...s, counts: { ...s.counts, [v.dhikr.id]: c }, log },
      event: c === v.target ? 'complete' : 'tick',
    }
  }

  const isLast = v.stepIndex === v.seq.steps.length - 1
  if (c === v.target && !isLast) {
    return {
      state: { ...s, seqProgress: { ...s.seqProgress, [v.seq.id]: { step: v.stepIndex + 1, count: 0 } }, log },
      event: 'step',
    }
  }
  return {
    state: { ...s, seqProgress: { ...s.seqProgress, [v.seq.id]: { step: v.stepIndex, count: c } }, log },
    event: c === v.target ? 'complete' : 'tick',
  }
}

export function undo(s: State): State {
  const v = getView(s)
  if (!v) return s
  if (!v.seq) {
    if (v.count === 0) return s
    return { ...s, counts: { ...s.counts, [v.dhikr.id]: v.count - 1 }, log: addLog(s.log, v.dhikr.id, -1) }
  }
  if (v.count > 0) {
    return {
      ...s,
      seqProgress: { ...s.seqProgress, [v.seq.id]: { step: v.stepIndex, count: v.count - 1 } },
      log: addLog(s.log, v.dhikr.id, -1),
    }
  }
  if (v.stepIndex === 0) return s
  // Step back across an auto-advance: the previous step ends one short of its target.
  const prev = v.seq.steps[v.stepIndex - 1]
  return {
    ...s,
    seqProgress: { ...s.seqProgress, [v.seq.id]: { step: v.stepIndex - 1, count: prev.target - 1 } },
    log: addLog(s.log, prev.dhikrId, -1),
  }
}

export function reset(s: State): State {
  const a = s.active
  if (!a) return s
  if (a.kind === 'dhikr') return { ...s, counts: { ...s.counts, [a.id]: 0 } }
  return { ...s, seqProgress: { ...s.seqProgress, [a.id]: { step: 0, count: 0 } } }
}

export function upsertDhikr(s: State, d: Dhikr): State {
  const exists = s.dhikrs.some((x) => x.id === d.id)
  return { ...s, dhikrs: exists ? s.dhikrs.map((x) => (x.id === d.id ? d : x)) : [...s.dhikrs, d] }
}

export function deleteDhikr(s: State, id: string): State {
  const { [id]: _, ...counts } = s.counts
  const sequences = s.sequences.map((q) => ({ ...q, steps: q.steps.filter((st) => st.dhikrId !== id) }))
  const active = s.active?.kind === 'dhikr' && s.active.id === id ? null : s.active
  return { ...s, dhikrs: s.dhikrs.filter((d) => d.id !== id), sequences, counts, active }
}

export function upsertSequence(s: State, q: Sequence): State {
  const exists = s.sequences.some((x) => x.id === q.id)
  const { [q.id]: _, ...seqProgress } = s.seqProgress // steps may have changed: restart it
  return { ...s, sequences: exists ? s.sequences.map((x) => (x.id === q.id ? q : x)) : [...s.sequences, q], seqProgress }
}

export function deleteSequence(s: State, id: string): State {
  const { [id]: _, ...seqProgress } = s.seqProgress
  const active = s.active?.kind === 'sequence' && s.active.id === id ? null : s.active
  return { ...s, sequences: s.sequences.filter((q) => q.id !== id), seqProgress, active }
}

// ---------- stats ----------

export function dayTotal(s: State, day: string): number {
  return Object.values(s.log[day] ?? {}).reduce((a, b) => a + b, 0)
}

/** Consecutive days with at least one count, ending today (or yesterday if today is still empty). */
export function streak(s: State): number {
  const d = new Date()
  if (dayTotal(s, dayKey(d)) === 0) d.setDate(d.getDate() - 1)
  let n = 0
  while (dayTotal(s, dayKey(d)) > 0) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
