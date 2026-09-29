import { useState } from 'react'
import { newId } from '../lib/store'
import type { Dhikr, Sequence, SequenceStep } from '../lib/types'
import { IconClose, IconPlus } from './Icons'
import { Modal } from './Modal'

type Props = {
  sequence: Sequence | null
  dhikrs: Dhikr[]
  onSave: (q: Sequence) => void
  onDelete: (id: string) => void
  onClose: () => void
}

type Row = { dhikrId: string; target: string }

export function EditSequence({ sequence, dhikrs, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(sequence?.name ?? '')
  const [rows, setRows] = useState<Row[]>(
    sequence?.steps.map((s) => ({ dhikrId: s.dhikrId, target: String(s.target) })) ??
      (dhikrs[0] ? [{ dhikrId: dhikrs[0].id, target: String(dhikrs[0].target) }] : []),
  )

  const steps: SequenceStep[] = rows.map((r) => ({ dhikrId: r.dhikrId, target: Number(r.target) }))
  const valid =
    name.trim() !== '' &&
    steps.length > 0 &&
    steps.every((s) => dhikrs.some((d) => d.id === s.dhikrId) && Number.isInteger(s.target) && s.target >= 1)
  const total = steps.reduce((a, s) => a + (Number.isFinite(s.target) ? s.target : 0), 0)

  const update = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <Modal title={sequence ? 'Edit sequence' : 'New sequence'} onClose={onClose}>
      {(close) => (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            onSave({ id: sequence?.id ?? newId(), name: name.trim(), steps })
            close()
          }}
        >
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning adhkar" autoFocus required />
          </label>

          <div className="field">
            <span>Steps</span>
            {dhikrs.length === 0 && <p className="muted small">Add a dhikr first, then build a sequence from it.</p>}
            <ol className="step-rows">
              {rows.map((r, i) => (
                <li key={i} className="step-row">
                  <span className="step-num">{i + 1}</span>
                  <select
                    value={r.dhikrId}
                    onChange={(e) => {
                      const d = dhikrs.find((x) => x.id === e.target.value)
                      update(i, { dhikrId: e.target.value, target: d ? String(d.target) : r.target })
                    }}
                    aria-label={`Step ${i + 1} dhikr`}
                  >
                    {dhikrs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={r.target}
                    onChange={(e) => update(i, { target: e.target.value })}
                    aria-label={`Step ${i + 1} count`}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    aria-label={`Remove step ${i + 1}`}
                  >
                    <IconClose />
                  </button>
                </li>
              ))}
            </ol>
            {dhikrs.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost add-step"
                onClick={() => {
                  const d = dhikrs[rows.length % dhikrs.length]
                  setRows([...rows, { dhikrId: d.id, target: String(d.target) }])
                }}
              >
                <IconPlus /> Add step
              </button>
            )}
            {rows.length > 0 && <p className="muted small">Total {total.toLocaleString()} counts</p>}
          </div>

          <div className="form-actions">
            {sequence && (
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={() => {
                  if (confirm(`Delete "${sequence.name}"?`)) {
                    onDelete(sequence.id)
                    close()
                  }
                }}
              >
                Delete
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!valid}>
              Save
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
