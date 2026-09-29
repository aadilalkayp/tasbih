import { useEffect, useRef, useState } from 'react'
import type { View } from '../lib/store'
import type { State } from '../lib/types'
import { IconReset, IconUndo } from './Icons'

type Props = {
  view: View
  state: State
  flash: 'step' | 'complete' | null
  onPointerCount: (e: React.PointerEvent) => void
  onUndo: () => void
  onReset: () => void
  pointerHint: boolean
}

const R = 92
const CIRC = 2 * Math.PI * R
const finePointer = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches

export function Counter({ view, state, flash, onPointerCount, onUndo, onReset, pointerHint }: Props) {
  const { dhikr, count, target, seq, stepIndex } = view
  const countRef = useRef<HTMLDivElement>(null)
  const prev = useRef(count)
  const [confirmReset, setConfirmReset] = useState(false)

  const isLastStep = !seq || stepIndex === seq.steps.length - 1
  const done = count >= target
  const allDone = done && isLastStep
  const progress = Math.min(count / target, 1)

  // Small "bump" on every count.
  useEffect(() => {
    if (count > prev.current && countRef.current && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      countRef.current.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], {
        duration: 140,
        easing: 'cubic-bezier(.2,.8,.2,1)',
      })
    }
    prev.current = count
  }, [count])

  useEffect(() => {
    if (!confirmReset) return
    const t = setTimeout(() => setConfirmReset(false), 2500)
    return () => clearTimeout(t)
  }, [confirmReset])

  const status = allDone
    ? seq
      ? 'Sequence complete'
      : 'Target reached'
    : `of ${target.toLocaleString()}`

  return (
    <>
      <div
        className="tap"
        role="button"
        tabIndex={-1}
        aria-label={`Count ${dhikr.name}. ${count} of ${target}.`}
        onPointerDown={onPointerCount}
        data-done={allDone || undefined}
        data-flash={flash ?? undefined}
      >
        <div className="dhikr-head" key={dhikr.id}>
          {seq && (
            <div className="seq-label">
              {seq.name} · {stepIndex + 1}/{seq.steps.length}
            </div>
          )}
          {dhikr.arabic && (
            <div className="arabic" lang="ar" dir="rtl">
              {dhikr.arabic}
            </div>
          )}
          <div className="dhikr-name">{dhikr.name}</div>
          {dhikr.meaning && <div className="dhikr-meaning">{dhikr.meaning}</div>}
        </div>

        <div className="ring-wrap">
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
          <div className="ring-center">
            <div className="count" ref={countRef} aria-live="off">
              {count.toLocaleString()}
            </div>
            <div className="of">{status}</div>
          </div>
        </div>

        {seq && (
          <div className="steps" aria-hidden="true">
            {seq.steps.map((st, i) => {
              const name = state.dhikrs.find((d) => d.id === st.dhikrId)?.name ?? ''
              const cls = i < stepIndex ? 'done' : i === stepIndex ? (done ? 'done' : 'current') : ''
              return (
                <span key={i} className={`step ${cls}`} title={`${name} × ${st.target}`}>
                  {st.target}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="controls">
        <button className="ctl" onClick={onUndo} disabled={count === 0 && stepIndex === 0} title="Undo (Backspace)">
          <IconUndo />
          <span>Undo</span>
        </button>
        <div className="hint" aria-live="polite">
          {pointerHint ? (
            <span className="hint-warn">Mouse clicks are off · press Space</span>
          ) : finePointer ? (
            <>
              <kbd>Space</kbd> count · <kbd>⌫</kbd> undo · <kbd>M</kbd> mute
            </>
          ) : (
            'Tap anywhere to count'
          )}
        </div>
        <button
          className={`ctl ${confirmReset ? 'ctl-danger' : ''}`}
          disabled={count === 0 && stepIndex === 0}
          onClick={() => {
            if (confirmReset) {
              onReset()
              setConfirmReset(false)
            } else setConfirmReset(true)
          }}
          title="Reset this counter"
        >
          <IconReset />
          <span>{confirmReset ? 'Tap again' : 'Reset'}</span>
        </button>
      </div>
    </>
  )
}
