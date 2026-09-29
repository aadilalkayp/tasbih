import { useRef } from 'react'
import { CLICK_SOUNDS, DONE_SOUNDS, hapticsSupported, previewClick, previewDone } from '../lib/feedback'
import { dayKey, sanitize } from '../lib/store'
import { THEMES } from '../lib/themes'
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
          <div className="field">
            <span>Appearance</span>
            <div className="themes" role="radiogroup" aria-label="Theme">
              {THEMES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  role="radio"
                  aria-checked={s.theme === t.id}
                  className="theme-tile"
                  data-t={t.id}
                  onClick={() => onSettings({ theme: t.id })}
                  title={t.desc}
                >
                  <span className="theme-swatch" aria-hidden="true">
                    <ThemeEmblem id={t.id} />
                  </span>
                  <span className="theme-name">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

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

function ThemeEmblem({ id }: { id: string }) {
  switch (id) {
    case 'misbaha':
      return (
        <svg viewBox="0 0 40 40">
          {Array.from({ length: 11 }, (_, i) => {
            const a = ((100 + i * 31) * Math.PI) / 180
            return <circle key={i} cx={20 + 13 * Math.cos(a)} cy={19 + 13 * Math.sin(a)} r="2.6" fill={i < 6 ? '#1e6b58' : '#cdb893'} />
          })}
          <ellipse cx="20" cy="34" rx="2.4" ry="3.4" fill="#1e6b58" />
        </svg>
      )
    case 'geometric':
      return (
        <svg viewBox="0 0 40 40" fill="none" stroke="#e7cf8f" strokeWidth="1.5">
          <rect x="11" y="11" width="18" height="18" />
          <rect x="11" y="11" width="18" height="18" transform="rotate(45 20 20)" />
        </svg>
      )
    case 'night':
      return (
        <svg viewBox="0 0 40 40">
          <path d="M27 8a9 9 0 1 0 6 13 7 7 0 1 1-6-13Z" fill="#f4e7c0" />
          <path d="M6 32 L12 26 L17 28 L21 21" stroke="#c8cdff" strokeWidth=".8" fill="none" />
          {[[6, 32], [12, 26], [17, 28], [21, 21]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.4" fill="#fff" />
          ))}
        </svg>
      )
    case 'water':
      return (
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M0 26 Q5 23 10 26 T20 26 T30 26 T40 26 V40 H0Z" fill="#7fb8b5" />
          <circle cx="20" cy="15" r="4" stroke="#2f7d7d" strokeWidth="1" />
          <circle cx="20" cy="15" r="8" stroke="#2f7d7d" strokeWidth=".8" opacity=".5" />
        </svg>
      )
    case 'ink':
      return (
        <svg viewBox="0 0 40 40">
          <text x="20" y="28" textAnchor="middle" fontFamily="Amiri, serif" fontSize="24" fontWeight="700" fill="#1b1a17">
            ع
          </text>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 40 40" fill="none" strokeWidth="2.5">
          <circle cx="20" cy="20" r="12" stroke="#d9d2c4" />
          <path d="M20 8a12 12 0 0 1 11.4 15.7" stroke="#1e6b58" strokeLinecap="round" />
        </svg>
      )
  }
}
