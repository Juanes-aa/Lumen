import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import MobileNav from './MobileNav'
import { useIsMobile } from '../hooks/useIsMobile'

/**
 * App shell.
 *
 * Desktop (≥ 768px):  [Sidebar 220px] | [main — fills rest]
 * Mobile  (< 768px):  [MobileHeader 52px] / [main — fills rest] / [MobileNav 56px+]
 *
 * Uses a flex-column wrapper on mobile so header and nav are pinned
 * by flexbox — no position:fixed needed, no padding compensation.
 */
export default function Layout(): React.ReactElement {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#1A1917',
        }}
      >
        <MobileHeader />
        <main
          style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <Outlet />
        </main>
        <MobileNav />
      </div>
    )
  }

  // ── Desktop — exactly as before ──────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        background: '#1A1917',
      }}
    >
      <Sidebar />
      <main
        style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <Outlet />
      </main>
    </div>
  )
}
