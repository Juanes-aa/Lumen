interface LumenSymbolProps {
  size?: number
  color?: string
}

export default function LumenSymbol({ size = 20, color = '#FAC775' }: LumenSymbolProps) {
  const angles: number[] = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill={color} />
      {angles.map((deg) => {
        const rad: number = (deg * Math.PI) / 180
        const x1: number = 12 + Math.cos(rad) * 5.5
        const y1: number = 12 + Math.sin(rad) * 5.5
        const x2: number = 12 + Math.cos(rad) * 9.5
        const y2: number = 12 + Math.sin(rad) * 9.5
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}
