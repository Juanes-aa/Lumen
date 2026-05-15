import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { logoutUser } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import LumenSymbol from './LumenSymbol'

interface NavSpec {
  to: string
  label: string
  end?: boolean
}

const NAV_ITEMS: NavSpec[] = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/search', label: 'Explorar' },
  { to: '/library', label: 'Mis películas' },
  { to: '/history', label: 'Análisis' },
  { to: '/recommendations', label: 'Recomendaciones' },
  { to: '/profile', label: 'Perfil' },
]

export default function Sidebar(): React.ReactElement {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout(): Promise<void> {
    try {
      await logoutUser()
    } catch {
      // ignorar
    }
    clearAuth()
    navigate('/login')
  }

  return (
    <aside
      aria-label="Navegación principal"
      style={{
        width: 220,
        flexShrink: 0,
        height: '100%',
        background: '#0F0E0D',
        borderRight: '0.4px solid #2E2D2B',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 24,
        paddingBottom: 20,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', marginBottom: 36 }}>
        <LumenSymbol size={26} />
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 500, color: '#FAF9F6', letterSpacing: '-0.02em', lineHeight: 1 }}>
          Lumen
        </span>
      </div>

      {/* Nav principal */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const forceActive: boolean = item.to === '/history' && location.pathname.startsWith('/analysis')
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `lumen-nav-item${isActive || forceActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '0.4px solid #2E2D2B', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          type="button"
          onClick={() => { void handleLogout() }}
          className="lumen-nav-item"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
