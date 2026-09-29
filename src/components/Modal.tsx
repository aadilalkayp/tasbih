import { useEffect, useRef, type ReactNode } from 'react'
import { IconClose } from './Icons'

type Props = { title: string; onClose: () => void; children: (close: () => void) => ReactNode }

/** Native <dialog>: focus trap, Esc and backdrop handled by the browser. */
export function Modal({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  const close = () => ref.current?.close()

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
    >
      <div className="modal">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <IconClose />
          </button>
        </header>
        {children(close)}
      </div>
    </dialog>
  )
}
