import { useState } from 'react'
import { dayKey, dayTotal, streak } from '../lib/store'
import type { Active, Dhikr, Sequence, State } from '../lib/types'
import { IconClose, IconEdit, IconPlus } from './Icons'

type Tab = 'dhikr' | 'sequences' | 'today'

type Props = {
  state: State
  open: boolean
  onClose: () => void
  onSelect: (a: Active) => void
  onEditDhikr: (d: Dhikr | null) => void
  onEditSequence: (q: Sequence | null) => void
}

export function Panel({ state, open, onClose, onSelect, onEditDhikr, onEditSequence }: Props) {
  const [tab, setTab] = useState<Tab>(() => (state.active?.kind === 'sequence' ? 'sequences' : 'dhikr'))

  return (
    <>
      <div className="backdrop" data-open={open || undefined} onClick={onClose} />
      <aside className="panel" data-open={open || undefined} aria-label="Dhikr list">
        <div className="panel-head">
          <div className="tabs" role="tablist">
            {(['dhikr', 'sequences', 'today'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)}>
                {t === 'dhikr' ? 'Dhikr' : t === 'sequences' ? 'Sequences' : 'Today'}
              </button>
            ))}
          </div>
          <button className="icon-btn panel-close" onClick={onClose} aria-label="Close list">
            <IconClose />
          </button>
        </div>

        <div className="panel-body">
          {tab === 'dhikr' && <DhikrList state={state} onSelect={onSelect} onEdit={onEditDhikr} />}
          {tab === 'sequences' && <SequenceList state={state} onSelect={onSelect} onEdit={onEditSequence} />}
          {tab === 'today' && <Today state={state} />}
        </div>
      </aside>
    </>
  )
}

function DhikrList({ state, onSelect, onEdit }: { state: State; onSelect: Props['onSelect']; onEdit: Props['onEditDhikr'] }) {
  return (
    <>
      <ul className="list">
        {state.dhikrs.map((d) => {
          const c = state.counts[d.id] ?? 0
          const active = state.active?.kind === 'dhikr' && state.active.id === d.id
          return (
            <li key={d.id} className="item" data-active={active || undefined}>
              <button className="item-main" onClick={() => onSelect({ kind: 'dhikr', id: d.id })}>
                <span className="item-title">{d.name}</span>
                {d.arabic && (
                  <span className="item-arabic" lang="ar" dir="rtl">
                    {d.arabic}
                  </span>
                )}
                <span className="item-meta">
                  <span className="mini-bar">
                    <span style={{ width: `${Math.min(c / d.target, 1) * 100}%` }} data-done={c >= d.target || undefined} />
                  </span>
                  <span className="tabular">
                    {c.toLocaleString()} / {d.target.toLocaleString()}
                  </span>
                </span>
              </button>
              <button className="icon-btn item-edit" onClick={() => onEdit(d)} aria-label={`Edit ${d.name}`}>
                <IconEdit />
              </button>
            </li>
          )
        })}
      </ul>
      <button className="btn btn-ghost add" onClick={() => onEdit(null)}>
        <IconPlus /> Add dhikr
      </button>
    </>
  )
}

function SequenceList({
  state,
  onSelect,
  onEdit,
}: {
  state: State
  onSelect: Props['onSelect']
  onEdit: Props['onEditSequence']
}) {
  const name = (id: string) => state.dhikrs.find((d) => d.id === id)?.name ?? '?'
  return (
    <>
      {state.sequences.length === 0 && (
        <p className="muted small pad">Chain several dhikrs together, e.g. 33 · 33 · 34 after salah.</p>
      )}
      <ul className="list">
        {state.sequences.map((q) => {
          const p = state.seqProgress[q.id]
          const active = state.active?.kind === 'sequence' && state.active.id === q.id
          return (
            <li key={q.id} className="item" data-active={active || undefined}>
              <button className="item-main" onClick={() => onSelect({ kind: 'sequence', id: q.id })} disabled={!q.steps.length}>
                <span className="item-title">{q.name}</span>
                <span className="item-sub">{q.steps.map((s) => `${name(s.dhikrId)} ${s.target}`).join(' → ') || 'No steps'}</span>
                {p && (p.step > 0 || p.count > 0) && (
                  <span className="item-meta tabular">
                    Step {Math.min(p.step, q.steps.length - 1) + 1} of {q.steps.length} · {p.count}
                  </span>
                )}
              </button>
              <button className="icon-btn item-edit" onClick={() => onEdit(q)} aria-label={`Edit ${q.name}`}>
                <IconEdit />
              </button>
            </li>
          )
        })}
      </ul>
      <button className="btn btn-ghost add" onClick={() => onEdit(null)}>
        <IconPlus /> Add sequence
      </button>
    </>
  )
}

function Today({ state }: { state: State }) {
  const today = dayKey()
  const totals = state.log[today] ?? {}
  const rows = state.dhikrs.filter((d) => (totals[d.id] ?? 0) > 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), total: dayTotal(state, dayKey(d)) }
  })
  const max = Math.max(1, ...days.map((d) => d.total))
  const s = streak(state)

  return (
    <div className="today">
      <div className="stats">
        <div className="stat">
          <div className="stat-value tabular">{dayTotal(state, today).toLocaleString()}</div>
          <div className="stat-label">counts today</div>
        </div>
        <div className="stat">
          <div className="stat-value tabular">{s}</div>
          <div className="stat-label">day streak</div>
        </div>
      </div>

      <div className="week" aria-label="Last 7 days">
        {days.map((d) => (
          <div key={d.key} className="week-col" title={`${d.key}: ${d.total}`}>
            <div className="week-bar">
              <span style={{ height: `${(d.total / max) * 100}%` }} data-today={d.key === today || undefined} />
            </div>
            <div className="week-label">{d.label}</div>
          </div>
        ))}
      </div>

      {rows.length > 0 ? (
        <ul className="today-list">
          {rows.map((d) => (
            <li key={d.id}>
              <span>{d.name}</span>
              <span className="tabular">{(totals[d.id] ?? 0).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small pad">Nothing counted yet today.</p>
      )}
    </div>
  )
}
