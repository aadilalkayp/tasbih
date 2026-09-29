import { useState } from 'react'
import { newId } from '../lib/store'
import type { Dhikr } from '../lib/types'
import { Modal } from './Modal'

type Props = {
  dhikr: Dhikr | null
  onSave: (d: Dhikr) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const QUICK = [33, 99, 100, 150, 1000]

export function EditDhikr({ dhikr, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(dhikr?.name ?? '')
  const [arabic, setArabic] = useState(dhikr?.arabic ?? '')
  const [meaning, setMeaning] = useState(dhikr?.meaning ?? '')
  const [target, setTarget] = useState(String(dhikr?.target ?? 100))
  const t = Number(target)
  const valid = name.trim() !== '' && Number.isInteger(t) && t >= 1 && t <= 1_000_000

  return (
    <Modal title={dhikr ? 'Edit dhikr' : 'New dhikr'} onClose={onClose}>
      {(close) => (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            onSave({ id: dhikr?.id ?? newId(), name: name.trim(), arabic: arabic.trim(), meaning: meaning.trim(), target: t })
            close()
          }}
        >
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SubhanAllah" autoFocus required />
          </label>
          <label className="field">
            <span>
              Arabic <em>optional</em>
            </span>
            <input className="arabic-input" lang="ar" dir="rtl" value={arabic} onChange={(e) => setArabic(e.target.value)} />
          </label>
          <label className="field">
            <span>
              Meaning <em>optional</em>
            </span>
            <input value={meaning} onChange={(e) => setMeaning(e.target.value)} />
          </label>
          <div className="field">
            <label htmlFor="target">Target</label>
            <input
              id="target"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000000}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <div className="chips">
              {QUICK.map((q) => (
                <button type="button" key={q} className={`chip ${t === q ? 'on' : ''}`} onClick={() => setTarget(String(q))}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="form-actions">
            {dhikr && (
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={() => {
                  if (confirm(`Delete "${dhikr.name}"? It will also be removed from any sequences.`)) {
                    onDelete(dhikr.id)
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
