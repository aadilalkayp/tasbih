import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { arabicDigits, seeded } from '../lib/themes'
import type { Dhikr, Theme } from '../lib/types'

export type VisualProps = {
  count: number
  target: number
  done: boolean
  status: string
  dhikr: Dhikr
  /** Where the last pointer count landed, relative to the tap area. */
  lastTap: RefObject<{ x: number; y: number; t: number } | null>
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Runs `fn` whenever the count goes up (not on undo / reset / first render). */
function useOnIncrement(count: number, fn: () => void) {
  const prev = useRef(count)
  useEffect(() => {
    if (count > prev.current && !reducedMotion()) fn()
    prev.current = count
  }, [count])
}

export function Visual({ theme, ...p }: VisualProps & { theme: Theme }) {
  switch (theme) {
    case 'misbaha':
      return <Beads {...p} />
    case 'geometric':
      return <Star {...p} />
    case 'night':
      return <Night {...p} />
    case 'water':
      return <Water {...p} />
    case 'ink':
      return <Ink {...p} />
    default:
      return <Ring {...p} />
  }
}

// ---------- Minimal ----------

const R = 92
const CIRC = 2 * Math.PI * R

function Ring({ count, target, status }: VisualProps) {
  const progress = Math.min(count / target, 1)
  return (
    <div className="visual ring-wrap">
      <svg className="ring" viewBox="0 0 200 200" aria-hidden="true">
        <circle className="ring-track" cx="100" cy="100" r={R} />
        <circle
          className="ring-bar"
          cx="100"
          cy="100"
          r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <div className="visual-center">
        <div className="count">{count.toLocaleString()}</div>
        <div className="of">{status}</div>
      </div>
    </div>
  )
}

// ---------- Misbaha: prayer beads, in rounds of up to 33 ----------

function Beads({ count, target, done, status }: VisualProps) {
  const perRound = target <= 40 ? target : 33
  const rounds = Math.ceil(target / perRound)
  const round = count === 0 ? 0 : Math.floor((count - 1) / perRound)
  const filled = done ? perRound : count === 0 ? 0 : count - round * perRound
  const beadRefs = useRef<(SVGCircleElement | null)[]>([])

  const beads = useMemo(() => {
    const BR = 118
    const gap = 26
    const spacing = (2 * Math.PI * BR * (1 - gap / 360)) / Math.max(perRound - 1, 1)
    const r = Math.min(8.2, spacing * 0.42)
    return Array.from({ length: perRound }, (_, i) => {
      const a = ((90 + gap / 2 + (i * (360 - gap)) / Math.max(perRound - 1, 1)) * Math.PI) / 180
      return { cx: 150 + BR * Math.cos(a), cy: 150 + BR * Math.sin(a), r }
    })
  }, [perRound])

  useOnIncrement(count, () => {
    beadRefs.current[filled - 1]?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }], {
      duration: 380,
      easing: 'cubic-bezier(.3,1.6,.5,1)',
    })
  })

  return (
    <div className="visual beads-v">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <radialGradient id="beadOff" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#f3e7d0" />
            <stop offset=".6" stopColor="#cdb893" />
            <stop offset="1" stopColor="#9c8660" />
          </radialGradient>
          <radialGradient id="beadOn" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#7fc2ab" />
            <stop offset=".55" stopColor="#1e6b58" />
            <stop offset="1" stopColor="#0c3a2f" />
          </radialGradient>
          <radialGradient id="beadGold" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fff0c4" />
            <stop offset=".55" stopColor="#d4a13f" />
            <stop offset="1" stopColor="#7d5510" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="118" fill="none" stroke="#8a7456" strokeWidth="1" opacity=".5" />
        <path
          d="M150 268 L150 292 M150 292 l-6 18 M150 292 l0 20 M150 292 l6 18"
          stroke={done ? '#a6771f' : '#1e6b58'}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="150" cy="272" rx="8" ry="13" fill={done ? 'url(#beadGold)' : 'url(#beadOn)'} />
        {beads.map((b, i) => (
          <circle
            key={i}
            ref={(el) => {
              beadRefs.current[i] = el
            }}
            className="bead"
            cx={b.cx}
            cy={b.cy}
            r={b.r}
            fill={i < filled ? (done ? 'url(#beadGold)' : 'url(#beadOn)') : 'url(#beadOff)'}
          />
        ))}
      </svg>
      <div className="visual-center">
        <div className="count">{count.toLocaleString()}</div>
        <div className="of">{status}</div>
        {rounds > 1 && !done && (
          <div className="round">
            round {round + 1} of {rounds}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Geometric: Rub el Hizb ----------

function starPath(R: number, rot = 0) {
  const r = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8)
  let d = ''
  for (let k = 0; k < 16; k++) {
    const a = ((-90 + rot + k * 22.5) * Math.PI) / 180
    const rr = k % 2 ? r : R
    d += (k ? 'L' : 'M') + (145 + rr * Math.cos(a)).toFixed(2) + ' ' + (145 + rr * Math.sin(a)).toFixed(2)
  }
  return d + 'Z'
}
const OUTER = starPath(128)
const INNER = starPath(92, 22.5)

function Star({ count, target, status }: VisualProps) {
  const progress = Math.min(count / target, 1)
  return (
    <div className="visual star-v">
      <svg viewBox="0 0 290 290" aria-hidden="true">
        <path className="star-fill" d={OUTER} />
        <path className="star-track" d={OUTER} />
        <path className="star-prog" d={OUTER} pathLength={100} strokeDasharray={100} strokeDashoffset={100 - progress * 100} />
        <path className="star-inner" d={INNER} />
        <circle cx="145" cy="145" r="62" className="star-circle" />
      </svg>
      <div className="visual-center">
        <div className="count" lang="ar">
          {arabicDigits(count)}
        </div>
        <div className="latin">
          {count.toLocaleString()} / {target.toLocaleString()}
        </div>
        <div className="of">{status}</div>
      </div>
    </div>
  )
}

// ---------- Night sky: a constellation toward the crescent ----------

function Night({ count, target, done, status }: VisualProps) {
  const n = Math.min(target, 33)
  const lit = done ? n : Math.min(n, Math.ceil((count / target) * n))
  const starRefs = useRef<(SVGCircleElement | null)[]>([])

  const pts = useMemo(() => {
    const rnd = seeded(11)
    return Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 1 : i / (n - 1)
      return [
        24 + t * 176 + Math.sin(t * Math.PI * 2.2) * 26 + (rnd() - 0.5) * 18,
        262 - t * 172 + Math.cos(t * Math.PI * 1.6) * 20 + (rnd() - 0.5) * 18,
      ] as const
    })
  }, [n])

  useOnIncrement(count, () => {
    starRefs.current[lit - 1]?.animate([{ transform: 'scale(1)' }, { transform: 'scale(2.6)' }, { transform: 'scale(1)' }], {
      duration: 600,
      easing: 'ease-out',
    })
  })

  return (
    <div className="visual night-v">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <filter id="starGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="moonHalo" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <mask id="crescent">
            <rect width="300" height="300" fill="#fff" />
            <circle cx="258" cy="36" r="26" fill="#000" />
          </mask>
        </defs>
        <circle className="moon-glow" cx="246" cy="44" r="34" filter="url(#moonHalo)" />
        <circle className="moon" cx="246" cy="44" r="28" mask="url(#crescent)" />
        <polyline className="constellation" points={pts.slice(0, lit).map((p) => p.join(',')).join(' ')} />
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            ref={(el) => {
              starRefs.current[i] = el
            }}
            className={`night-star ${i < lit ? 'on' : ''}`}
            cx={x}
            cy={y}
            r={i < lit ? 2.2 : 1.3}
          />
        ))}
      </svg>
      <div className="night-count">
        <div className="count">
          {count.toLocaleString()}
          <small> / {target.toLocaleString()}</small>
        </div>
        {done && <div className="of">{status}</div>}
      </div>
      <div className="shooting-star" />
    </div>
  )
}

/** Faint star dust behind the whole app in the night theme. */
export function NightDust() {
  const dots = useMemo(() => {
    const rnd = seeded(3)
    return Array.from({ length: 140 }, () => ({ x: rnd() * 100, y: rnd() * 100, r: rnd() * 0.9 + 0.25, o: rnd() * 0.4 + 0.05 }))
  }, [])
  return (
    <svg className="night-dust" aria-hidden="true" preserveAspectRatio="none">
      {dots.map((d, i) => (
        <circle key={i} cx={`${d.x}%`} cy={`${d.y}%`} r={d.r} opacity={d.o} />
      ))}
    </svg>
  )
}

// ---------- Still water: ripples and a rising tide ----------

let rippleId = 0

function Water({ count, target, status, lastTap }: VisualProps) {
  const progress = Math.min(count / target, 1)
  const [ripples, setRipples] = useState<{ id: number; x: string; y: string }[]>([])

  useOnIncrement(count, () => {
    const tap = lastTap.current
    const fresh = tap && performance.now() - tap.t < 200
    const r = { id: ++rippleId, x: fresh ? `${tap.x}px` : '50%', y: fresh ? `${tap.y}px` : '55%' }
    setRipples((rs) => [...rs.slice(-6), r])
    setTimeout(() => setRipples((rs) => rs.filter((x) => x.id !== r.id)), 1200)
  })

  return (
    <>
      <div className="water-layer" aria-hidden="true">
        <div className="water-fill" style={{ height: `${progress * 100}%` }}>
          <svg className="wave" viewBox="0 0 800 20" preserveAspectRatio="none">
            <path d="M0 10 Q50 0 100 10 T200 10 T300 10 T400 10 T500 10 T600 10 T700 10 T800 10 V20 H0Z" />
          </svg>
          <svg className="wave b" viewBox="0 0 800 20" preserveAspectRatio="none">
            <path d="M0 10 Q50 20 100 10 T200 10 T300 10 T400 10 T500 10 T600 10 T700 10 T800 10 V20 H0Z" />
          </svg>
        </div>
        {ripples.map((r) => (
          <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }} />
        ))}
      </div>
      <div className="visual water-v">
        <div className="visual-center">
          <div className="count">{count.toLocaleString()}</div>
          <div className="of">{status}</div>
        </div>
      </div>
    </>
  )
}

// ---------- Ink: the calligraphy is the progress bar ----------

function Ink({ count, target, status, dhikr }: VisualProps) {
  const progress = Math.min(count / target, 1)
  const text = dhikr.arabic || dhikr.name
  const size = text.length <= 16 ? 'l' : text.length <= 26 ? 'm' : 's'
  return (
    <div className="visual ink-v">
      <div className={`ink-text ink-${size}`} lang={dhikr.arabic ? 'ar' : undefined} dir={dhikr.arabic ? 'rtl' : undefined}>
        <div className="ink-ghost">{text}</div>
        <div className="ink-filled" style={{ clipPath: `inset(${(1 - progress) * 100}% 0 0 0)` }}>
          {text}
        </div>
      </div>
      <div className="ink-meta">
        <div className="count">{count.toLocaleString()}</div>
        <div className="of">{status}</div>
        <div className="brush" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  )
}
