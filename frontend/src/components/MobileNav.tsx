import { NavLink, useLocation } from 'react-router-dom'

// ── Iconos ────────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }): React.ReactElement {
  const c = active ? '#FAC775' : '#888780'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
      <path d="M9 21V13h6v8" />
    </svg>
  )
}

function SearchIcon({ active }: { active: boolean }): React.ReactElement {
  const c = active ? '#FAC775' : '#888780'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  )
}

function LibraryIcon({ active }: { active: boolean }): React.ReactElement {
  const c = active ? '#FAC775' : '#888780'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="9" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function AnalysisIcon({ active }: { active: boolean }): React.ReactElement {
  const c = active ? '#FAC775' : '#888780'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }): React.ReactElement {
  const c = active ? '#FAC775' : '#888780'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.866 3.582-7 8-7s8 3.134 8 7" />
    </svg>
  )
}

// ── Datos ──────────────────────────────────────────────────────────────────────

interface BottomNavItem {
  to: string
  label: string
  end?: boolean
  forceActivePath?: string
  Icon: (props: { active: boolean }) => React.ReactElement
}

const BOTTOM_NAV: BottomNavItem[] = [
  { to: '/',            label: 'Inicio',    end: true,  Icon: HomeIcon     },
  { to: '/search',      label: 'Explorar',              Icon: SearchIcon   },
  { to: '/library',     label: 'Biblioteca',             Icon: LibraryIcon  },
  { to: '/history',     label: 'Análisis',  forceActivePath: '/analysis', Icon: AnalysisIcon },
  { to: '/profile',     label: 'Perfil',                Icon: ProfileIcon  },
]

// ── Componente ─────────────────────────────────────────────────────────────────

/**
 * Bottom tab bar shown only on mobile (< 768px).
 * Rendered inside the flex-column layout — sits at the bottom naturally.
 * Accounts for iOS safe-area-inset-bottom via paddingBottom.
 */
export default function MobileNav(): React.ReactElement {
  const location = useLocation()

  return (
    <nav
      aria-label="Navegación principal"
      style={{
        flexShrink: 0,
        background: '#0F0E0D',
        borderTop: '0.4px solid #2E2D2B',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {BOTTOM_NAV.map((item) => {
        const forceActive: boolean =
          item.forceActivePath !== undefined &&
          location.pathname.startsWith(item.forceActivePath)
        const Icon = item.Icon

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 4px', textDecoration: 'none', minHeight: 56 }}
          >
            {({ isActive }) => {
              const active: boolean = isActive || forceActive
              return (
                <>
                  <Icon active={active} />
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9,
                      letterSpacing: '0.04em',
                      lineHeight: 1,
                      color: active ? '#FAC775' : '#888780',
                    }}
                  >
                    {item.label}
                  </span>
                </>
              )
            }}
          </NavLink>
        )
      })}
    </nav>
  )
}
