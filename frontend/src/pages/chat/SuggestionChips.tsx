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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-pantalla-soft border-[0.4px] border-borde animate-pulse"
            style={{ height: 30, width: 130, borderRadius: 4 }}
          />
        ))}
      </div>
    )
  }
  if (suggestions.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {suggestions.map((s) => {
        const used: boolean = usedSuggestions.has(s)
        return (
          <button
            key={s}
            type="button"
            className="lumen-chip-suggestion focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            style={{ opacity: used ? 0.4 : 1, pointerEvents: used ? 'none' : 'auto' }}
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
