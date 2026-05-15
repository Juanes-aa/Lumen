import type { ChatMessage } from './useChatStream'

interface MessageBubbleProps {
  message: ChatMessage
}

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
  if (message.role === 'user') {
    return (
      <div className="lumen-msg-enter flex justify-end">
        <div className="max-w-[62%] bg-pantalla border-[0.4px] border-borde rounded-[10px_10px_2px_10px] px-[14px] py-[10px]">
          <p className="font-sans text-[13px] text-celuloide leading-[1.65] whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="lumen-msg-enter flex flex-col gap-[6px] max-w-[68%]">
      <span className="font-mono text-[11px] text-gray-mid tracking-[0.06em]">Lumen</span>
      <div className="border-l-2 border-amber" style={{ paddingLeft: 20 }}>{renderParagraphs(message.content)}</div>
    </div>
  )
}
