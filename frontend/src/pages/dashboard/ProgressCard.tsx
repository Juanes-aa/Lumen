import { useSemanticProfileQuery } from '../../api/queries'

const ANALYSIS_TARGET: number = 5

interface ProgressBarProps {
  value: number
  max: number
}

function ProgressBar({ value, max }: ProgressBarProps): React.ReactElement {
  const pct: number = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-[2px] bg-borde rounded-[1px] overflow-hidden">
      <div
        className="h-full bg-amber rounded-[1px] transition-[width] duration-[400ms] ease-out"
        style={{ width: `${pct.toString()}%` }}
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
      <p className="lumen-overline mb-4">Tu perfil hasta ahora</p>
      {semanticTags.length > 0 ? (
        <div className="flex flex-wrap gap-[7px] mb-5">
          {semanticTags.map((tag) => (
            <span key={tag} className="lumen-tag-pill">
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="font-sans text-xs text-gray-mid mb-5 leading-relaxed">
          Cuando cierres tus primeras sesiones, aquí aparecerán los temas que dominan tu forma de
          mirar cine.
        </p>
      )}
      <div className="lumen-section px-[14px] py-3">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-sans text-xs text-celuloide">Perfil en construcción</span>
          <span className="font-mono text-[10px] text-amber">
            {analysesCount}/{ANALYSIS_TARGET}
          </span>
        </div>
        <ProgressBar value={analysesCount} max={ANALYSIS_TARGET} />
        <p className="font-sans text-[11px] text-gray-mid mt-2 leading-relaxed">
          {analysesCount >= ANALYSIS_TARGET
            ? 'Tu perfil base está completo. Cada nueva sesión lo sigue refinando.'
            : `${(ANALYSIS_TARGET - analysesCount).toString()} análisis más para completar tu perfil semántico.`}
        </p>
      </div>
    </div>
  )
}
