import { useSemanticProfileQuery } from '../../api/queries'

const ANALYSIS_TARGET: number = 5

interface ProgressBarProps {
  value: number
  max: number
}

function ProgressBar({ value, max }: ProgressBarProps): React.ReactElement {
  const pct: number = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ height: 2, background: '#2E2D2B', borderRadius: 1, overflow: 'hidden' }}>
      <div
        className="lumen-bar-fill"
        style={{ height: '100%', width: `${pct.toString()}%`, background: '#FAC775', borderRadius: 1, transition: 'width 400ms ease' }}
      />
    </div>
  )
}

export default function ProgressCard(): React.ReactElement {
  const profileQuery = useSemanticProfileQuery()
  const profile = profileQuery.data ?? null

  const analysesCount: number = profile?.total_sesiones_analizadas ?? 0
  const semanticTags: string[] = (profile?.temas_frecuentes ?? []).slice(0, 5).map((t) => t.value)

  return (
    <div className="lumen-anim-4">
      <p className="lumen-overline" style={{ marginBottom: 16 }}>Tu perfil hasta ahora</p>

      {semanticTags.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
          {semanticTags.map((tag) => (
            <span key={tag} className="lumen-tag-pill">{tag}</span>
          ))}
        </div>
      ) : (
        <p className="font-sans text-gray-mid" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
          Cuando cierres tus primeras sesiones, aquí aparecerán los temas que dominan tu forma de mirar cine.
        </p>
      )}

      <div style={{ background: '#252421', border: '0.4px solid #2E2D2B', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span className="font-sans text-celuloide" style={{ fontSize: 12 }}>Perfil en construcción</span>
          <span className="font-mono text-amber" style={{ fontSize: 10 }}>
            {analysesCount}/{ANALYSIS_TARGET}
          </span>
        </div>
        <ProgressBar value={analysesCount} max={ANALYSIS_TARGET} />
        <p className="font-sans text-gray-mid" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
          {analysesCount >= ANALYSIS_TARGET
            ? 'Tu perfil base está completo. Cada nueva sesión lo sigue refinando.'
            : `${(ANALYSIS_TARGET - analysesCount).toString()} análisis más para completar tu perfil semántico.`}
        </p>
      </div>
    </div>
  )
}
