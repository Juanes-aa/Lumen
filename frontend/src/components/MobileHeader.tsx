import { Link } from 'react-router-dom'
import LumenSymbol from './LumenSymbol'

/**
 * Fixed top bar shown only on mobile (< 768px).
 * Renders inside the flex-column layout — no position:fixed needed.
 */
export default function MobileHeader(): React.ReactElement {
  return (
    <header
      aria-label="Cabecera"
      style={{
        height: 52,
        flexShrink: 0,
        background: '#0F0E0D',
        borderBottom: '0.4px solid #2E2D2B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Link
        to="/"
        aria-label="Ir a inicio"
        style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
      >
        <LumenSymbol size={20} />
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 500,
            color: '#FAF9F6',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Lumen
        </span>
      </Link>
    </header>
  )
}
