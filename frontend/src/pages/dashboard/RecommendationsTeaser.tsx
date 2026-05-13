import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { useRecommendationsQuery } from '../../api/queries'

export default function RecommendationsTeaser(): React.ReactElement {
  const navigate = useNavigate()
  const recsQuery = useRecommendationsQuery()
  const activeCount: number = (recsQuery.data ?? []).filter((r) => r.status === 'active').length

  if (activeCount > 0) {
    return (
      <div className="lumen-anim-5">
        <p className="lumen-overline mb-[14px]">Lumen sugiere</p>
        <p className="font-sans text-xs text-gray-mid mb-3 leading-relaxed">
          Tienes {activeCount.toString()}{' '}
          {activeCount === 1 ? 'sugerencia personalizada' : 'sugerencias personalizadas'} basadas
          en tu perfil.
        </p>
        <Button
          className="w-full text-center text-xs"
          onClick={() => {
            navigate('/recommendations')
          }}
        >
          Ver recomendaciones
        </Button>
      </div>
    )
  }

  return (
    <div className="lumen-anim-5">
      <p className="lumen-overline mb-[14px]">Empezar</p>
      <Button
        className="w-full text-center text-xs"
        onClick={() => {
          navigate('/search')
        }}
      >
        Buscar una película
      </Button>
    </div>
  )
}
