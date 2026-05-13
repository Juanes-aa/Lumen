import { useCallback, useEffect, useRef, useState } from 'react'
import Button from './ui/Button'

interface WatchedModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  isLoading: boolean
}

const MAX_NOTE_LENGTH = 500

export default function WatchedModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: WatchedModalProps): React.ReactElement | null {
  const [note, setNote] = useState<string>('')
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (isOpen) {
      setNote('')
      document.addEventListener('keydown', handleKeyDown)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (e.target === overlayRef.current) onClose()
  }

  function handleConfirm(): void {
    onConfirm(note.trim())
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="watched-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(15,14,13,0.7)] backdrop-blur-[4px] lumen-fade-in"
    >
      <div className="w-full max-w-[460px] bg-sala border-[0.4px] border-borde rounded-xl p-6 shadow-[0_16px_64px_rgba(0,0,0,0.6)]">
        <h2
          id="watched-modal-title"
          className="font-serif text-[22px] font-medium text-celuloide tracking-[-0.01em] mb-1"
        >
          Marcar como vista
        </h2>
        <p className="font-mono text-[10px] text-gray-mid tracking-[0.06em] mb-[18px]">
          Una nota inicial puede ayudar a recordar el contexto.
        </p>

        <label
          htmlFor="watched-note"
          className="font-sans text-xs text-gray-mid block mb-[6px]"
        >
          Nota inicial (opcional)
        </label>
        <textarea
          id="watched-note"
          ref={textareaRef}
          className="lumen-textarea focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          value={note}
          onChange={(e) => {
            const val: string = e.target.value
            if (val.length <= MAX_NOTE_LENGTH) setNote(val)
          }}
          placeholder="¿Qué te dejó esta película?"
          rows={4}
          maxLength={MAX_NOTE_LENGTH}
        />
        <p className="font-mono text-[10px] text-gray-dark tracking-[0.05em] text-right mt-[6px] mb-[18px]">
          {note.length}/{MAX_NOTE_LENGTH.toString()}
        </p>

        <div className="flex justify-end gap-[10px]">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} className="text-xs px-[14px] py-2">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Guardando…' : 'Marcar como vista'}
          </Button>
        </div>
      </div>
    </div>
  )
}
