import { useRef } from 'react'
import { CLICK_SOUNDS, DONE_SOUNDS, hapticsSupported, previewClick, previewDone } from '../lib/feedback'
import { dayKey, sanitize } from '../lib/store'
import type { Settings, State } from '../lib/types'
import { Modal } from './Modal'

type Props = {
  state: State
  onSettings: (patch: Partial<Settings>) => void
  onReplace: (s: State) => void
  onResetAll: () => void
  onClose: () => void
}

const COOLDOWNS = [
  { ms: 0, label: 'Off' },
  { ms: 80, label: 'Short (80 ms)' },
  { ms: 120, label: 'Normal (120 ms)' },
  { ms: 200, label: 'Long (200 ms)' },
  { ms: 350, label: 'Very long (350 ms)' },
]

export function SettingsDialog({ state, onSettings, onReplace, onResetAll, onClose }: Props) {
  const s = state.settings
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `tasbih-backup-${dayKey()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const importData = async (file: File) => {
    try {
      const next = sanitize(JSON.parse(await file.text()))
      if (confirm(`Replace your current data with this backup (${next.dhikrs.length} dhikrs, ${next.sequences.length} sequences)?`)) {
        onReplace(next)
      }
    } catch {
      alert("That file isn't a valid Tasbih backup.")
    }
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      {() => (
        <div className="form">
          <Toggle
            label="Sound"
            desc="A sound on every count and a distinct one when you reach the target. Tap to preview."
            checked={s.sound}
            onChange={(v) => onSettings({ sound: v })}
          >
            <div className="sound-pick" role="radiogroup" aria-label="Count sound">
              <span className="sound-pick-label">Count</span>
              <div className="chips">
                {CLICK_SOUNDS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    role="radio"
                    aria-checked={s.clickSound === c.id}
                    className={`chip ${s.clickSound === c.id ? 'on' : ''}`}
                    onClick={() => {
                      onSettings({ clickSound: c.id })
                      previewClick(c.id)
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sound-pick" role="radiogroup" aria-label="Target reached sound">
              <span className="sound-pick-label">On target</span>
              <div className="chips">
                {DONE_SOUNDS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    role="radio"
                    aria-checked={s.doneSound === c.id}
                    className={`chip ${s.doneSound === c.id ? 'on' : ''}`}
                    onClick={() => {
                      onSettings({ doneSound: c.id })
                      previewDone(c.id)
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </Toggle>

          <Toggle
            label="Haptics"
            desc={
              hapticsSupported
                ? 'Light tap per count, a long distinct buzz on completion. On iPhone (iOS 18+) only a light tap pattern is possible.'
                : 'Not supported on this device.'
            }
            checked={s.haptics}
            disabled={!hapticsSupported}
            onChange={(v) => onSettings({ haptics: v })}
          />

          <Toggle
            label="Ignore mouse & trackpad clicks"
            desc="Only the keyboard (Space / Enter) and touch screens count. Stops accidental trackpad taps."
            checked={s.ignorePointer}
            onChange={(v) => onSettings({ ignorePointer: v })}
          />

          <label className="field">
            <span>Double-count guard</span>
            <select value={s.cooldownMs} onChange={(e) => onSettings({ cooldownMs: Number(e.target.value) })}>
              {COOLDOWNS.map((c) => (
                <option key={c.ms} value={c.ms}>
                  {c.label}
                </option>
              ))}
            </select>
            <small className="muted">Ignores a second count that comes in faster than this.</small>
          </label>

          <div className="field">
            <span>Your data</span>
            <small className="muted">Everything is stored only in this browser. Back it up to move it to another device.</small>
            <div className="chips">
              <button type="button" className="btn btn-ghost" onClick={exportData}>
                Export backup
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                Import backup
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void importData(f)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={() => {
                  if (confirm('Erase all dhikrs, sequences, counts and history? This cannot be undone.')) onResetAll()
                }}
              >
                Erase all
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Toggle({
  label,
  desc,
  checked,
  disabled,
  onChange,
  children,
}: {
  label: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <div className="toggle-row">
      <label className="toggle">
        <span className="toggle-text">
          <span className="toggle-label">{label}</span>
          <small className="muted">{desc}</small>
        </span>
        <input type="checkbox" className="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      </label>
      {children}
    </div>
  )
}
