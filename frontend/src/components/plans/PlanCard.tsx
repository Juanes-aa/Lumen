import { Link } from 'react-router-dom'

interface PlanFeature {
  text: string
}

export interface PlanCardProps {
  /** Label corto del plan, p.ej. "Free", "Pro", "Studio" */
  name: string
  /** Nombre display en serif grande, p.ej. "Pensar" */
  tagline: string
  /** Precio formateado, p.ej. "$7" o "$0" */
  price: string
  /** Unidad de precio, p.ej. "/mes". Omitir si no aplica. */
  priceUnit?: string
  /** Subtítulo breve bajo el precio */
  sublabel: string
  features: PlanFeature[]
  ctaText: string
  ctaHref: string
  ctaVariant?: 'primary' | 'secondary'
  isRecommended?: boolean
}

function CheckIcon(): React.ReactElement {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden="true"
      style={{ marginTop: 2 }}
    >
      <path
        d="M2.5 7.5L6 11L12.5 4"
        stroke="#1D9E75"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PlanCard({
  name,
  tagline,
  price,
  priceUnit,
  sublabel,
  features,
  ctaText,
  ctaHref,
  ctaVariant = 'secondary',
  isRecommended = false,
}: PlanCardProps): React.ReactElement {
  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 10,
        position: 'relative',
        background: '#252421',
        border: isRecommended ? '0.5px solid #FAC775' : '0.4px solid #2E2D2B',
        padding: '28px 28px 24px',
      }}
    >
      {/* Badge recomendado */}
      {isRecommended && (
        <div
          style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)' }}
        >
          <span
            className="font-mono uppercase whitespace-nowrap"
            style={{
              display: 'inline-block',
              background: 'rgba(250, 199, 117, 0.10)',
              border: '0.5px solid rgba(250, 199, 117, 0.40)',
              borderRadius: 6,
              color: '#FAC775',
              fontSize: 10,
              letterSpacing: '0.12em',
              padding: '5px 12px',
            }}
          >
            Recomendado
          </span>
        </div>
      )}

      {/* Nombre del plan */}
      <div style={{ marginBottom: 20 }}>
        <p
          className="lumen-overline"
          style={{ marginBottom: 8 }}
        >
          {name}
        </p>
        <h2
          className="font-serif text-celuloide"
          style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.1 }}
        >
          {tagline}
        </h2>
      </div>

      {/* Precio */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
        <span
          className="font-mono text-celuloide"
          style={{ fontSize: 36, lineHeight: 1 }}
        >
          {price}
        </span>
        {priceUnit !== undefined && (
          <span
            className="font-mono text-gray-mid"
            style={{ fontSize: 14 }}
          >
            {priceUnit}
          </span>
        )}
      </div>

      {/* Sublabel */}
      <p
        className="font-sans text-gray-mid"
        style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 24 }}
      >
        {sublabel}
      </p>

      {/* Divider */}
      <div
        className="border-t"
        style={{ borderColor: '#2E2D2B', borderTopWidth: '0.4px', marginBottom: 20 }}
      />

      {/* Lista de features */}
      <ul
        style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 12, marginBottom: 24, listStyle: 'none', padding: 0 }}
      >
        {features.map((f) => (
          <li key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CheckIcon />
            <span
              className="font-sans text-celuloide"
              style={{ fontSize: 13.5, lineHeight: 1.6 }}
            >
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        to={ctaHref}
        className={ctaVariant === 'primary' ? 'lumen-btn-primary' : 'lumen-btn-secondary'}
        style={{
          display: 'block',
          textAlign: 'center',
          textDecoration: 'none',
          borderRadius: 10,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: ctaVariant === 'primary' ? 500 : 400,
        }}
      >
        {ctaText}
      </Link>
    </article>
  )
}

export default PlanCard
