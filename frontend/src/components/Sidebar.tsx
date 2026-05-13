import { NavLink, useNavigate } from 'react-router-dom'
import { logoutUser } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import LumenSymbol from './LumenSymbol'

interface NavSpec {
  to: string
  label: string
}

const NAV_ITEMS: NavSpec[] = [
  { to: '/', label: 'Inicio' },
  { to: '/search', label: 'Explorar' },
  { to: '/library', label: 'Mis películas' },
  { to: '/history', label: 'Análisis' },
  { to: '/recommendations', label: 'Recomendaciones' },
  { to: '/profile', label: 'Perfil' },
  { to: '/profile', label: 'Configuración' },
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
      className="w-[220px] shrink-0 h-full bg-abyss border-r-[0.4px] border-borde flex flex-col pt-7 pb-5"
    >
      {/* Logo */}
      <div className="flex items-center gap-[10px] px-[18px] mb-10">
        <LumenSymbol size={26} />
        <span className="font-serif text-[26px] font-medium text-celuloide tracking-[-0.02em] leading-none">
          Lumen
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-[2px]">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={`${item.to}-${item.label}`}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `lumen-nav-item${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t-[0.4px] border-borde pt-4 flex flex-col gap-3">
        <div className="mx-[14px]">
          <div className="bg-sala border-[0.4px] border-borde rounded-md px-[10px] py-2 flex flex-col gap-[7px]">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[10px] text-gray-mid tracking-[0.1em] uppercase">
                Plan
              </span>
              <span className="font-mono text-[10px] text-gray-mid">Free</span>
            </div>
            <button
              type="button"
              className="bg-transparent border-[0.4px] border-[rgba(250,199,117,0.25)] rounded-[4px] text-amber font-sans text-[11px] font-medium py-[5px] cursor-pointer w-full text-center hover:bg-[rgba(250,199,117,0.06)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            >
              Upgrade →
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { void handleLogout() }}
          className="mx-[18px] font-sans text-[11px] text-gray-dark hover:text-gray-mid transition-colors text-left bg-transparent border-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
