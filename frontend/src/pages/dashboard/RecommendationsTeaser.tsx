import { useNavigate } from 'react-router-dom'
import { useRecommendationsQuery } from '../../api/queries'
import type { RecommendationOut } from '../../types/recommendations'

interface RecPreviewCardProps {
  rec: RecommendationOut
  onClick: () => void
}

function RecPreviewCard({ rec, onClick }: RecPreviewCardProps): React.ReactElement {
  return (
    <div
      className="bg-pantalla border-[0.4px] border-borde rounded-[8px] px-[13px] py-3 cursor-pointer transition-colors hover:border-borde-soft"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
      role="button"
      tabIndex={0}
    >
      <p className="font-serif text-[15px] font-medium text-celuloide mb-1">
        {rec.title}
      </p>
      <p className="font-sans text-[11.5px] text-gray-mid leading-[1.55] mb-2 line-clamp-3">
        {rec.reason}
      </p>
      <p className="font-mono text-[10px] text-amber tracking-[0.06em]">
        Ver por qué →
      </p>
    </div>
  )
}

export default function RecommendationsTeaser(): React.ReactElement {
  const navigate = useNavigate()
  const recsQuery = useRecommendationsQuery()
  const activeRecs = (recsQuery.data ?? []).filter((r) => r.status === 'active')
  const topRec: RecommendationOut | null = activeRecs[0] ?? null

  if (topRec !== null) {
    return (
      <div className="lumen-anim-5">
        <p className="lumen-overline mb-[14px]">Empezar</p>
        <button
          type="button"
          className="lumen-btn-primary w-full text-center text-[12px] mb-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          onClick={() => { navigate('/search') }}
        >
          Buscar una película
        </button>
        <div className="border-t-[0.4px] border-borde pt-5">
          <p className="lumen-overline mb-[10px]">Recomendación</p>
          <RecPreviewCard
            rec={topRec}
            onClick={() => { navigate('/recommendations') }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="lumen-anim-5">
      <p className="lumen-overline mb-[14px]">Empezar</p>
      <button
        type="button"
        className="lumen-btn-primary w-full text-center text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        onClick={() => { navigate('/search') }}
      >
        Buscar una película
      </button>
    </div>
  )
}
