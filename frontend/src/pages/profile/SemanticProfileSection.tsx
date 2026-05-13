import { useSemanticProfileQuery } from '../../api/queries'
import type { TopItem } from '../../types/profile'

interface TopicBarProps {
  topic: TopItem
  max: number
}

function TopicBar({ topic, max }: TopicBarProps): React.ReactElement {
  const pct: number = max === 0 ? 0 : Math.round((topic.count / max) * 100)
  return (
    <div className="flex items-center gap-3 mb-[10px]">
      <span className="font-sans text-[13px] text-celuloide w-[180px] shrink-0">{topic.value}</span>
      <div className="flex-1 h-[2px] bg-borde rounded-[1px] overflow-hidden">
        <div
          className="lumen-bar-fill h-full bg-amber rounded-[1px]"
          style={{ width: `${pct.toString()}%` }}
        />
      </div>
      <span className="font-mono text-[10px] text-gray-mid tracking-[0.06em] w-5 text-right shrink-0">
        {topic.count}
      </span>
    </div>
  )
}

export default function SemanticProfileSection(): React.ReactElement {
  const profileQuery = useSemanticProfileQuery()
  const profile = profileQuery.data ?? null

  const temas: TopItem[] = profile?.temas_frecuentes ?? []
  const directoresAfines: TopItem[] = profile?.directores_afines ?? []
  const maxCount: number = temas.length > 0 ? temas[0].count : 1
  const narrativeTypes: string[] =
    profile?.narrativa_predominante !== null && profile !== null
      ? [profile.narrativa_predominante]
      : []

  return (
    <section className="lumen-anim-2 lumen-section">
      <span className="lumen-overline mb-4">Tu perfil intelectual</span>

      {narrativeTypes.length > 0 ? (
        <div className="flex gap-2 mb-[22px] flex-wrap">
          {narrativeTypes.map((t) => (
            <span
              key={t}
              className="bg-[rgba(250,199,117,0.08)] border-[0.4px] border-[rgba(250,199,117,0.25)] rounded-[4px] text-amber font-mono text-[10.5px] px-[10px] py-1 tracking-[0.08em] uppercase"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mb-6">
        <p className="font-sans text-xs text-gray-mid mb-[14px]">Temas frecuentes</p>
        {temas.length > 0 ? (
          temas.slice(0, 8).map((t) => <TopicBar key={t.value} topic={t} max={maxCount} />)
        ) : (
          <p className="font-serif italic text-sm text-gray-mid leading-[1.5]">
            Cuando cierres tus primeras sesiones, aquí aparecerán los temas que dominan tu forma de
            mirar cine.
          </p>
        )}
      </div>

      {directoresAfines.length > 0 ? (
        <div>
          <p className="font-sans text-xs text-gray-mid mb-[10px]">Directores afines</p>
          <div className="flex flex-wrap gap-[7px]">
            {directoresAfines.slice(0, 8).map((d) => (
              <span key={d.value} className="lumen-chip-teal">
                {d.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
