import { useState } from 'react'
import Poster from '../../components/ui/Poster'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { SessionSummary } from '../../types/analysis'

interface ChatHeaderProps {
  session: SessionSummary | null
  messagesCount: number
  isStreaming: boolean
  isClosing: boolean
  onConfirmClose: () => void
}

export default function ChatHeader({
  session,
  messagesCount,
  isStreaming,
  isClosing,
  onConfirmClose,
}: ChatHeaderProps): React.ReactElement {
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false)
  const isMobile = useIsMobile()
  const isClosed: boolean = session?.status === 'closed'
  const closeDisabled: boolean = messagesCount === 0 || isStreaming || isClosing

  return (
    <header style={{ padding: isMobile ? '0 14px' : '0 32px', borderBottom: '0.4px solid #2E2D2B', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      <Poster
        url={session?.movie_poster_url ?? null}
        alt={session?.movie_title ?? 'Película'}
        width={28}
        height={42}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span className="font-serif text-celuloide" style={{ fontSize: isMobile ? 15 : 19, fontWeight: 500, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 160 : 340 }}>
            {session?.movie_title ?? 'Cargando…'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span className="font-mono text-[10px] text-gray-mid tracking-[0.06em] uppercase">
            Analizando con Lumen
          </span>
          <span
            className={`inline-flex items-center gap-[5px] rounded-[4px] px-[7px] py-[2px] border-[0.4px] ${
              isClosed
                ? 'bg-pantalla border-borde'
                : 'bg-teal-dark border-[rgba(29,158,117,0.25)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-[5px] h-[5px] rounded-full inline-block ${
                isClosed ? 'bg-gray-mid' : 'bg-teal shadow-[0_0_5px_rgba(29,158,117,0.5)]'
              }`}
            />
            <span
              className={`font-mono text-[9.5px] tracking-[0.06em] uppercase ${
                isClosed ? 'text-gray-mid' : 'text-teal'
              }`}
            >
              {isClosed ? 'Cerrada' : 'Activa'}
            </span>
          </span>
        </div>
      </div>

      {!isClosed ? (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setShowCloseConfirm(true)
            }}
            disabled={closeDisabled}
            className="bg-transparent border-none text-gray-mid font-sans cursor-pointer rounded-[4px] transition-colors hover:not-disabled:text-celuloide hover:not-disabled:bg-pantalla disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            style={{ fontSize: 11.5, padding: '5px 8px' }}
          >
            {isClosing ? 'Cerrando…' : isMobile ? 'Cerrar' : 'Cerrar sesión'}
          </button>
          {showCloseConfirm ? (
            <div
              className="absolute top-9 right-0 z-[100] bg-sala border-[0.4px] border-borde rounded-lg px-4 py-[14px] w-[220px] shadow-[0_8px_32px_rgba(0,0,0,0.6)] lumen-fade-in"
              role="dialog"
              aria-label="Confirmar cierre de sesión"
            >
              <p className="font-sans text-[12.5px] text-celuloide leading-[1.55] mb-3">
                ¿Cerrar la sesión ahora? Lumen extraerá las etiquetas semánticas.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseConfirm(false)
                    onConfirmClose()
                  }}
                  className="bg-pantalla border-[0.4px] border-borde rounded-[5px] text-celuloide font-sans text-[11px] font-medium px-3 py-[6px] cursor-pointer flex-1 hover:border-borde-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseConfirm(false)
                  }}
                  className="bg-transparent border-none rounded-[5px] text-gray-mid font-sans text-[11px] px-3 py-[6px] cursor-pointer hover:text-celuloide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <span className="font-mono text-[10px] text-gray-mid tracking-[0.06em]">
          Sesión guardada
        </span>
      )}
    </header>
  )
}
