interface SuggestionChipsProps {
  suggestions: string[]
  usedSuggestions: Set<string>
  isLoading: boolean
  onPick: (suggestion: string) => void
}

export default function SuggestionChips({
  suggestions,
  usedSuggestions,
  isLoading,
  onPick,
}: SuggestionChipsProps): React.ReactElement | null {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[30px] w-[130px] rounded-[4px] bg-pantalla-soft border-[0.4px] border-borde animate-pulse"
          />
        ))}
      </div>
    )
  }
  if (suggestions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {suggestions.map((s) => {
        const used: boolean = usedSuggestions.has(s)
        return (
          <button
            key={s}
            type="button"
            className={`lumen-chip-suggestion focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
              used ? 'opacity-40 pointer-events-none' : ''
            }`}
            onClick={() => {
              onPick(s)
            }}
            disabled={used}
          >
            {s}
          </button>
        )
      })}
    </div>
  )
}
