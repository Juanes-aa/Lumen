import { useIsMobile } from '../../hooks/useIsMobile'
import type { ChatMessage } from './useChatStream'

interface MessageBubbleProps {
  message: ChatMessage
}

// eslint-disable-next-line react-refresh/only-export-components
export function renderParagraphs(text: string, showCaret: boolean = false): React.ReactNode {
  const paragraphs: string[] = text.split('\n\n')
  return (
    <>
      {paragraphs.map((para, i) => (
        <p
          key={i}
          className={`font-sans text-[13.5px] text-celuloide leading-[1.75] ${
            i < paragraphs.length - 1 ? 'mb-3' : ''
          }`}
        >
          {para}
          {showCaret && i === paragraphs.length - 1 ? (
            <span
              aria-hidden="true"
              className="inline-block w-px h-[14px] bg-amber ml-[2px] align-middle"
              style={{ animation: 'lumen-pulse-dot 0.8s ease-in-out infinite' }}
            />
          ) : null}
        </p>
      ))}
    </>
  )
}

export default function MessageBubble({ message }: MessageBubbleProps): React.ReactElement {
  const isMobile = useIsMobile()

  if (message.role === 'user') {
    return (
      <div className="lumen-msg-enter" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="bg-pantalla border-[0.4px] border-borde" style={{ maxWidth: isMobile ? '85%' : '62%', padding: '10px 18px', borderRadius: '10px 10px 2px 10px' }}>
          <p className="font-sans text-celuloide" style={{ fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {message.content}
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="lumen-msg-enter" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: isMobile ? '92%' : '68%' }}>
      <span className="font-mono text-gray-mid" style={{ fontSize: 11, letterSpacing: '0.06em' }}>Lumen</span>
      <div className="border-l-2 border-amber" style={{ paddingLeft: 20 }}>{renderParagraphs(message.content)}</div>
    </div>
  )
}
