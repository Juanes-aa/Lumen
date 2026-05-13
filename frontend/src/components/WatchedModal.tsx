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
      className="lumen-fade-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(15,14,13,0.75)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 460,
          background: '#1A1917',
          border: '0.4px solid #2E2D2B',
          borderRadius: 16,
          padding: '28px 28px 24px',
          boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
        }}
      >
        <h2
          id="watched-modal-title"
          className="font-serif text-celuloide"
          style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 6 }}
        >
          Marcar como vista
        </h2>
        <p className="font-mono text-gray-mid" style={{ fontSize: 10.5, letterSpacing: '0.06em', marginBottom: 20 }}>
          Una nota inicial puede ayudar a recordar el contexto.
        </p>

        <label
          htmlFor="watched-note"
          className="font-sans text-gray-mid"
          style={{ fontSize: 11, display: 'block', marginBottom: 6 }}
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
        <p className="font-mono text-gray-dark" style={{ fontSize: 10, letterSpacing: '0.05em', textAlign: 'right', marginTop: 6, marginBottom: 20 }}>
          {note.length}/{MAX_NOTE_LENGTH.toString()}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
