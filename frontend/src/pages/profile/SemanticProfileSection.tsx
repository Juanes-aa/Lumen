import { useSemanticProfileQuery } from '../../api/queries'
import type { TopItem } from '../../types/profile'

interface TopicBarProps {
  topic: TopItem
  max: number
}

function TopicBar({ topic, max }: TopicBarProps): React.ReactElement {
  const pct: number = max === 0 ? 0 : Math.round((topic.count / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span className="font-sans text-celuloide" style={{ fontSize: 13, width: 180, flexShrink: 0 }}>{topic.value}</span>
      <div className="bg-borde rounded-[1px] overflow-hidden" style={{ flex: 1, height: 2 }}>
        <div
          className="lumen-bar-fill bg-amber rounded-[1px]"
          style={{ width: `${pct.toString()}%`, height: '100%' }}
        />
      </div>
      <span className="font-mono text-gray-mid" style={{ fontSize: 10, letterSpacing: '0.06em', width: 20, textAlign: 'right', flexShrink: 0 }}>
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
      <span className="lumen-overline" style={{ display: 'block', marginBottom: 20 }}>Tu perfil intelectual</span>

      {narrativeTypes.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {narrativeTypes.map((t) => (
            <span
              key={t}
              className="bg-[rgba(250,199,117,0.08)] border-[0.4px] border-[rgba(250,199,117,0.25)] rounded-[4px] text-amber font-mono uppercase"
              style={{ fontSize: 10.5, padding: '4px 10px', letterSpacing: '0.08em' }}
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ marginBottom: 28 }}>
        <p className="font-sans text-gray-mid" style={{ fontSize: 12, marginBottom: 18 }}>Temas frecuentes</p>
        {temas.length > 0 ? (
          temas.slice(0, 8).map((t) => <TopicBar key={t.value} topic={t} max={maxCount} />)
        ) : (
          <p className="font-serif italic text-gray-mid" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Cuando cierres tus primeras sesiones, aquí aparecerán los temas que dominan tu forma de
            mirar cine.
          </p>
        )}
      </div>

      {directoresAfines.length > 0 ? (
        <div>
          <p className="font-sans text-gray-mid" style={{ fontSize: 12, marginBottom: 14 }}>Directores afines</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
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
