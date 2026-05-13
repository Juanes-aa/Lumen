import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'

export default function EmptyDashboard(): React.ReactElement {
  const navigate = useNavigate()
  return (
    <div className="bg-pantalla-soft border-[0.4px] border-borde rounded-[10px] px-6 py-8 text-center">
      <p className="font-serif italic text-celuloide text-lg leading-snug mb-3">
        Tu biblioteca empieza con la primera película que viste con intención.
      </p>
      <Button
        onClick={() => {
          navigate('/search')
        }}
      >
        Buscar una película
      </Button>
    </div>
  )
}
