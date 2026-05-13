import { useNavigate } from 'react-router-dom'

export default function EmptyDashboard(): React.ReactElement {
  const navigate = useNavigate()
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        background: '#1E1D1B',
        border: '0.4px solid #2E2D2B',
        borderRadius: 10,
        padding: '48px 32px',
        minHeight: 200,
      }}
    >
      <p className="font-serif italic text-celuloide" style={{ fontSize: 17, lineHeight: 1.5, marginBottom: 20, maxWidth: 340 }}>
        Tu biblioteca empieza con la primera película que viste con intención.
      </p>
      <button
        type="button"
        className="lumen-btn-primary"
        onClick={() => { navigate('/search') }}
      >
        Buscar una película
      </button>
    </div>
  )
}
