import { NavLink, useNavigate } from 'react-router-dom'
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
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `lumen-nav-item${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '0.4px solid #2E2D2B', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavLink
          to="/profile"
          className={({ isActive }) => `lumen-nav-item${isActive ? ' active' : ''}`}
          style={{ fontSize: 13 }}
        >
          Configuración
        </NavLink>

        <div style={{ margin: '6px 14px 0' }}>
          <div style={{ background: '#1A1917', border: '0.4px solid #2E2D2B', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#888780', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Plan
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#888780' }}>Free</span>
            </div>
            <button
              type="button"
              style={{
                background: 'transparent',
                border: '0.4px solid rgba(250,199,117,0.25)',
                borderRadius: 4,
                color: '#FAC775',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 500,
                padding: '5px 0',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center',
              }}
            >
              Upgrade →
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { void handleLogout() }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#444441',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            cursor: 'pointer',
            textAlign: 'left',
            padding: '6px 18px 0',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
