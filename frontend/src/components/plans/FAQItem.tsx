import { useState, useId } from 'react'

interface FAQItemProps {
  question: string
  answer: string
}

export function FAQItem({ question, answer }: FAQItemProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const contentId = useId()

  return (
    <div className="border-b border-[0.4px] border-borde last:border-b-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => { setIsOpen((prev) => !prev) }}
        className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber transition-opacity duration-150 hover:opacity-80"
      >
        <span className="font-sans text-celuloide" style={{ fontSize: 14.5, lineHeight: 1.6 }}>
          {question}
        </span>
        <span
          className="shrink-0 text-gray-mid"
          style={{
            display: 'block',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <div
        id={contentId}
        role="region"
        style={{ display: isOpen ? 'block' : 'none', paddingBottom: 20 }}
      >
        <p className="font-sans text-gray-mid" style={{ fontSize: 14, lineHeight: 1.75 }}>
          {answer}
        </p>
      </div>
    </div>
  )
}

export default FAQItem
