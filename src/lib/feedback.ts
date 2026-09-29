import type { FeedbackEvent, Settings } from './types'

// ---------- sound (synthesised with Web Audio, no files) ----------

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(ac: AudioContext, freq: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

/** Soft wooden "bead" click. */
function playTick(ac: AudioContext) {
  const t = ac.currentTime
  tone(ac, 1480, t, 0.05, 0.16, 'triangle')
  tone(ac, 740, t, 0.07, 0.08)
}

/** Two rising notes: moving to the next step of a sequence. */
function playStep(ac: AudioContext) {
  const t = ac.currentTime
  tone(ac, 784, t, 0.35, 0.18)
  tone(ac, 1175, t + 0.13, 0.5, 0.16)
}

/** Bell-like arpeggio: target reached. Clearly different from the tick. */
function playComplete(ac: AudioContext) {
  const t = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    const at = t + i * 0.14
    tone(ac, f, at, 1.6, 0.2)
    tone(ac, f * 2.76, at, 0.6, 0.04) // inharmonic partial gives the bell colour
  })
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
  if (settings.sound) {
    const ac = audio()
    if (!ac) return
    if (event === 'tick') playTick(ac)
    else if (event === 'step') playStep(ac)
    else playComplete(ac)
  }
}

/** Plays a preview of a sound regardless of the mute setting (used in settings). */
export function preview(event: FeedbackEvent) {
  const ac = audio()
  if (!ac) return
  if (event === 'tick') playTick(ac)
  else if (event === 'step') playStep(ac)
  else playComplete(ac)
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
