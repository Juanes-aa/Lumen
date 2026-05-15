import { useRef, useState } from 'react'
import IconButton from '../../components/ui/IconButton'

function SendIcon(): React.ReactElement {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#412402"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

interface ComposerProps {
  disabled: boolean
  isStreaming: boolean
  onSend: (content: string) => void
}

export default function Composer({ disabled, isStreaming, onSend }: ComposerProps): React.ReactElement {
  const [input, setInput] = useState<string>('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  function autoResize(): void {
    const ta = inputRef.current
    if (ta === null) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120).toString()}px`
  }

  function handleSend(): void {
    const trimmed: string = input.trim()
    if (trimmed === '' || disabled) return
    onSend(trimmed)
    setInput('')
    if (inputRef.current !== null) inputRef.current.style.height = 'auto'
  }

  const sendDisabled: boolean = input.trim() === '' || disabled

  return (
    <>
      <div className="bg-pantalla border-[0.5px] border-borde rounded-[10px] transition-colors focus-within:border-amber" style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <textarea
          ref={inputRef}
          rows={1}
          placeholder={
            isStreaming ? 'Esperando respuesta…' : '¿Qué todavía estás procesando de esta película?'
          }
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            autoResize()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={disabled}
          aria-label="Mensaje para Lumen"
          className="bg-transparent border-none text-celuloide font-sans text-[13px] leading-[1.6] flex-1 min-h-[20px] max-h-[120px] overflow-y-auto p-0 resize-none focus:outline-none"
        />
        <IconButton
          variant="primary"
          size="md"
          aria-label="Enviar mensaje"
          icon={<SendIcon />}
          onClick={handleSend}
          disabled={sendDisabled}
        />
      </div>
      <p className="mt-[7px] font-mono text-[10px] text-gray-dark tracking-[0.05em] text-center">
        Enter para enviar · Shift+Enter nueva línea
      </p>
    </>
  )
}
