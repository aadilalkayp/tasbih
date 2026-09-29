import type { ClickSound, DoneSound, FeedbackEvent, Settings } from './types'

// ---------- sound (synthesised with Web Audio, no files) ----------

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  at: number,
  dur: number,
  vol: number,
  type: OscillatorType = 'sine',
  attack = 0.004,
  endFreq?: number,
) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + dur)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(vol, at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

/** Filtered white-noise burst, for percussive "knock" sounds. */
function knock(ac: AudioContext, at: number, freq: number, dur: number, vol: number) {
  if (!noise) {
    noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.1), ac.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const src = ac.createBufferSource()
  src.buffer = noise
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = 4
  const gain = ac.createGain()
  gain.gain.setValueAtTime(vol, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(filter).connect(gain).connect(ac.destination)
  src.start(at)
  src.stop(at + dur + 0.02)
}

export const CLICK_SOUNDS: { id: ClickSound; label: string }[] = [
  { id: 'bead', label: 'Bead' },
  { id: 'wood', label: 'Wood' },
  { id: 'pop', label: 'Pop' },
  { id: 'beep', label: 'Beep' },
  { id: 'crystal', label: 'Crystal' },
]

export const DONE_SOUNDS: { id: DoneSound; label: string }[] = [
  { id: 'bell', label: 'Bell' },
  { id: 'gong', label: 'Gong' },
  { id: 'chord', label: 'Chord' },
  { id: 'beeps', label: 'Alarm' },
]

const CLICK: Record<ClickSound, (ac: AudioContext, t: number) => void> = {
  bead: (ac, t) => {
    tone(ac, 1480, t, 0.05, 0.16, 'triangle')
    tone(ac, 740, t, 0.07, 0.08)
  },
  wood: (ac, t) => {
    knock(ac, t, 1900, 0.04, 0.5)
    tone(ac, 560, t, 0.06, 0.14, 'sine', 0.002, 420)
  },
  pop: (ac, t) => tone(ac, 720, t, 0.08, 0.28, 'sine', 0.003, 200),
  beep: (ac, t) => tone(ac, 1760, t, 0.04, 0.05, 'square', 0.002),
  crystal: (ac, t) => {
    tone(ac, 2637, t, 0.32, 0.09)
    tone(ac, 5274, t, 0.12, 0.02)
  },
}

const DONE: Record<DoneSound, (ac: AudioContext, t: number) => void> = {
  // Bell-like arpeggio; the inharmonic partial gives the bell colour.
  bell: (ac, t) => {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(ac, f, t + i * 0.14, 1.6, 0.2)
      tone(ac, f * 2.76, t + i * 0.14, 0.6, 0.04)
    })
  },
  gong: (ac, t) => {
    tone(ac, 98, t, 3.2, 0.35, 'sine', 0.01)
    tone(ac, 196.5, t, 2.4, 0.16, 'sine', 0.01)
    tone(ac, 263, t, 1.8, 0.1, 'sine', 0.01)
    tone(ac, 411, t, 1.2, 0.05, 'sine', 0.01)
  },
  chord: (ac, t) => {
    ;[392, 493.88, 587.33, 783.99].forEach((f, i) => tone(ac, f, t + i * 0.03, 2.2, 0.12, 'sine', 0.06))
  },
  beeps: (ac, t) => {
    ;[0, 0.2, 0.4].forEach((d) => tone(ac, 1320, t + d, 0.13, 0.08, 'square', 0.003))
    tone(ac, 1760, t + 0.62, 0.5, 0.08, 'square', 0.003)
  },
}

/** Two rising notes: moving to the next step of a sequence. */
function playStep(ac: AudioContext, t: number) {
  tone(ac, 784, t, 0.35, 0.18)
  tone(ac, 1175, t + 0.13, 0.5, 0.16)
}

function play(event: FeedbackEvent, settings: Pick<Settings, 'clickSound' | 'doneSound'>) {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  if (event === 'tick') CLICK[settings.clickSound](ac, t)
  else if (event === 'step') playStep(ac, t)
  else DONE[settings.doneSound](ac, t)
}

// ---------- haptics ----------

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/**
 * iOS Safari has no Vibration API, but toggling an `<input type="checkbox" switch>` (iOS 18+)
 * produces a system haptic tap. Only a single light tap is possible, so patterns are built from repeats.
 */
function iosTap() {
  const label = document.createElement('label')
  label.ariaHidden = 'true'
  label.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0;pointer-events:none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.appendChild(input)
  document.body.appendChild(label)
  label.click()
  label.remove()
}

function iosPattern(taps: number, gapMs: number) {
  iosTap()
  for (let i = 1; i < taps; i++) setTimeout(iosTap, i * gapMs)
}

const VIBRATION: Record<FeedbackEvent, number | number[]> = {
  tick: 12,
  step: [40, 60, 40],
  complete: [180, 90, 180, 90, 450],
}

function vibrate(event: FeedbackEvent) {
  if (canVibrate) navigator.vibrate(VIBRATION[event])
  else if (isIOS) {
    if (event === 'tick') iosTap()
    else if (event === 'step') iosPattern(2, 110)
    else iosPattern(5, 130)
  }
}

export const hapticsSupported = canVibrate || isIOS

export function feedback(event: FeedbackEvent, settings: Settings) {
  if (settings.haptics) {
    try {
      vibrate(event)
    } catch {
      /* ignore */
    }
  }
  if (settings.sound) play(event, settings)
}

/** Plays a sound regardless of the mute setting (used for previews in settings). */
export function previewClick(id: ClickSound) {
  play('tick', { clickSound: id, doneSound: 'bell' })
}

export function previewDone(id: DoneSound) {
  play('complete', { clickSound: 'bead', doneSound: id })
}

// ---------- keep the screen awake while counting ----------

let lock: WakeLockSentinel | null = null

export async function keepAwake() {
  if (lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return
  try {
    lock = await navigator.wakeLock.request('screen')
    lock.addEventListener('release', () => (lock = null))
  } catch {
    /* not allowed (e.g. low battery); fine */
  }
}
