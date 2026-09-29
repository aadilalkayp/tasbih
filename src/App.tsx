import { useCallback, useEffect, useRef, useState } from 'react'
import { Counter } from './components/Counter'
import { EditDhikr } from './components/EditDhikr'
import { EditSequence } from './components/EditSequence'
import { IconEye, IconEyeOff, IconList, IconMute, IconSettings, IconSound } from './components/Icons'
import { Panel } from './components/Panel'
import { SettingsDialog } from './components/SettingsDialog'
import { feedback, keepAwake } from './lib/feedback'
import * as store from './lib/store'
import type { Active, Dhikr, Sequence, Settings, State } from './lib/types'

type Dialog = { kind: 'dhikr'; dhikr: Dhikr | null } | { kind: 'sequence'; sequence: Sequence | null } | { kind: 'settings' } | null

const TYPING = 'input, textarea, select, [contenteditable="true"]'
const el = (t: EventTarget | null) => (t instanceof Element ? t : null)

export default function App() {
  const [state, setStateRaw] = useState<State>(store.loadState)
  // Latest state, readable synchronously so rapid counts never read a stale render.
  const ref = useRef(state)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [flash, setFlash] = useState<'step' | 'complete' | null>(null)
  const [pointerHint, setPointerHint] = useState(false)
  const lastCount = useRef(0)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const commit = useCallback((next: State) => {
    ref.current = next
    setStateRaw(next)
    store.saveState(next)
  }, [])
  const update = useCallback((fn: (s: State) => State) => commit(fn(ref.current)), [commit])

  const count = useCallback(() => {
    const now = performance.now()
    if (now - lastCount.current < ref.current.settings.cooldownMs) return
    lastCount.current = now
    const { state: next, event } = store.increment(ref.current)
    if (!event) return
    commit(next)
    feedback(event, next.settings)
    void keepAwake()
    if (event !== 'tick') {
      setFlash(event)
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(null), 1400)
    }
  }, [commit])

  const undo = useCallback(() => update(store.undo), [update])

  const onPointerCount = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if (e.pointerType === 'mouse' && ref.current.settings.ignorePointer) {
        setPointerHint(true)
        clearTimeout(hintTimer.current)
        hintTimer.current = setTimeout(() => setPointerHint(false), 2200)
        return
      }
      count()
    },
    [count],
  )

  const toggleFocus = useCallback(() => {
    update((s) => ({ ...s, settings: { ...s.settings, focus: !s.settings.focus } }))
    setPanelOpen(false)
  }, [update])

  // Keyboard: Space / Enter count, Backspace / - / Z undo, M mute, F focus mode, Esc leave focus mode.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = el(e.target)
      if (target?.closest(TYPING) || document.querySelector('dialog[open]')) return
      if (e.code === 'Space' || (e.key === 'Enter' && !target?.closest('button, a'))) {
        e.preventDefault()
        if (!e.repeat) count()
      } else if (e.key === 'Backspace' || e.key === '-' || e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      } else if (e.key.toLowerCase() === 'm') {
        update((s) => ({ ...s, settings: { ...s.settings, sound: !s.settings.sound } }))
      } else if (e.key.toLowerCase() === 'f') {
        toggleFocus()
      } else if (e.key === 'Escape' && ref.current.settings.focus) {
        toggleFocus()
      }
    }
    // Stop Space from also "clicking" whichever button happens to have focus.
    const onKeyUp = (e: KeyboardEvent) => {
      const target = el(e.target)
      if (e.code === 'Space' && !target?.closest(TYPING) && !document.querySelector('dialog[open]')) e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [count, undo, update, toggleFocus])

  // The wake lock is dropped when the tab is hidden; take it back when returning.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && lastCount.current > 0) void keepAwake()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const select = (a: Active) => {
    update((s) => ({ ...s, active: a }))
    setPanelOpen(false)
  }
  const setSettings = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }))

  const view = store.getView(state)
  const sound = state.settings.sound
  const focus = state.settings.focus

  return (
    <div className="app" data-focus={focus || undefined}>
      <main className="stage">
        <header className="topbar">
          <div className="brand">
            <img src="/icon.svg" alt="" width="22" height="22" />
            <h1>Tasbih</h1>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-btn"
              onClick={() => setSettings({ sound: !sound })}
              aria-label={sound ? 'Mute sound' : 'Unmute sound'}
              aria-pressed={!sound}
              title={sound ? 'Mute (M)' : 'Unmute (M)'}
            >
              {sound ? <IconSound /> : <IconMute />}
            </button>
            <button className="icon-btn" onClick={() => setDialog({ kind: 'settings' })} aria-label="Settings" title="Settings">
              <IconSettings />
            </button>
            <button className="icon-btn list-toggle" onClick={() => setPanelOpen(true)} aria-label="Open dhikr list">
              <IconList />
            </button>
            <button
              className="icon-btn focus-toggle"
              onClick={toggleFocus}
              aria-pressed={focus}
              aria-label={focus ? 'Show everything' : 'Hide everything except the counter'}
              title={focus ? 'Show everything (F / Esc)' : 'Focus mode (F)'}
            >
              {focus ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
        </header>

        {view ? (
          <Counter
            view={view}
            state={state}
            flash={flash}
            onPointerCount={onPointerCount}
            onUndo={undo}
            onReset={() => update(store.reset)}
            pointerHint={pointerHint}
          />
        ) : (
          <div className="empty">
            <p>Choose a dhikr to begin.</p>
            <button className="btn btn-primary" onClick={() => setPanelOpen(true)}>
              Open list
            </button>
          </div>
        )}
      </main>

      <Panel
        state={state}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSelect={select}
        onEditDhikr={(d) => setDialog({ kind: 'dhikr', dhikr: d })}
        onEditSequence={(q) => setDialog({ kind: 'sequence', sequence: q })}
      />

      {dialog?.kind === 'dhikr' && (
        <EditDhikr
          dhikr={dialog.dhikr}
          onSave={(d) => update((s) => ({ ...store.upsertDhikr(s, d), active: dialog.dhikr ? s.active : { kind: 'dhikr', id: d.id } }))}
          onDelete={(id) => update((s) => store.deleteDhikr(s, id))}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'sequence' && (
        <EditSequence
          sequence={dialog.sequence}
          dhikrs={state.dhikrs}
          onSave={(q) => update((s) => ({ ...store.upsertSequence(s, q), active: { kind: 'sequence', id: q.id } }))}
          onDelete={(id) => update((s) => store.deleteSequence(s, id))}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'settings' && (
        <SettingsDialog
          state={state}
          onSettings={setSettings}
          onReplace={commit}
          onResetAll={() => commit(store.defaultState())}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
