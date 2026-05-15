import { useEffect, useRef, useState } from 'react'
import {
  useMemoryNotesQuery,
  useSemanticProfileQuery,
  useSessionsQuery,
  useWatchedMoviesQuery,
} from '../api/queries'
import SemanticProfileSection from './profile/SemanticProfileSection'
import InstructionsSection from './profile/InstructionsSection'
import MemorySection from './profile/MemorySection'
import PreferencesSection from './profile/PreferencesSection'
import ExportSection from './profile/ExportSection'

interface StatsRowProps {
  moviesCount: number
  totalAnalyzed: number
  activeSessionsCount: number
  topicsCount: number
}

function StatsRow({ moviesCount, totalAnalyzed, activeSessionsCount, topicsCount }: StatsRowProps): React.ReactElement {
  const stats = [
    { label: 'Películas vistas', value: moviesCount },
    { label: 'Análisis cerrados', value: totalAnalyzed },
    { label: 'Sesiones activas', value: activeSessionsCount },
    { label: 'Temas explorados', value: topicsCount },
  ]
  return (
    <section className="lumen-anim-4 lumen-section" style={{ background: '#1E1D1B' }}>
      <span className="lumen-overline" style={{ display: 'block', marginBottom: 16 }}>Actividad</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="font-serif text-celuloide" style={{ fontSize: 28, fontWeight: 400, lineHeight: 1 }}>
              {stat.value}
            </p>
            <p className="font-mono text-gray-mid" style={{ fontSize: 10, letterSpacing: '0.06em', marginTop: 4 }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProfileSkeleton(): React.ReactElement {
  return (
    <div style={{ flex: 1, padding: '36px 44px', overflowY: 'auto' }}>
      <div style={{ height: 32, width: 200, background: '#252421', borderRadius: 4, marginBottom: 28 }} className="animate-pulse" />
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[200, 200, 180].map((h, i) => (
            <div key={i} style={{ height: h, background: '#252421', borderRadius: 10 }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[180, 140, 140].map((h, i) => (
            <div key={i} style={{ height: h, background: '#252421', borderRadius: 10 }} className="animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage(): React.ReactElement {
  const profileQuery = useSemanticProfileQuery()
  const sessionsQuery = useSessionsQuery()
  const moviesQuery = useWatchedMoviesQuery()
  useMemoryNotesQuery()

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  function showToast(message: string): void {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => { setToast(null) }, 2200)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const initialLoading = profileQuery.isPending || sessionsQuery.isPending || moviesQuery.isPending
  if (initialLoading) return <ProfileSkeleton />

  const profile = profileQuery.data ?? null
  const sessions = sessionsQuery.data ?? []
  const moviesCount = (moviesQuery.data ?? []).length
  const totalAnalyzed = profile?.total_sesiones_analizadas ?? 0
  const activeSessionsCount = sessions.filter((s) => s.status === 'active').length
  const topicsCount = (profile?.temas_frecuentes ?? []).length

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header className="lumen-anim-1" style={{ padding: '36px 44px 28px', flexShrink: 0 }}>
        <h1 className="font-serif text-celuloide" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Perfil
        </h1>
        <p className="font-mono text-gray-mid" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
          {totalAnalyzed === 0
            ? 'Aún no tienes análisis cerrados'
            : `${totalAnalyzed} ${totalAnalyzed === 1 ? 'película analizada' : 'películas analizadas'}`}
        </p>
      </header>

      {/* ── Columnas ── */}
      <div style={{ display: 'flex', flex: 1, paddingBottom: 48, minHeight: 0 }}>

        {/* Columna izquierda 60% */}
        <div style={{ flex: '0 0 60%', padding: '0 44px', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <SemanticProfileSection />
          <InstructionsSection onToast={showToast} />
          <MemorySection onToast={showToast} />
        </div>

        {/* Columna derecha 40% */}
        <aside style={{ flex: '0 0 40%', padding: '0 44px 48px 24px', borderLeft: '0.4px solid #2E2D2B', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <PreferencesSection onToast={showToast} />
          <StatsRow
            moviesCount={moviesCount}
            totalAnalyzed={totalAnalyzed}
            activeSessionsCount={activeSessionsCount}
            topicsCount={topicsCount}
          />
          <ExportSection />
        </aside>
      </div>

      {toast !== null ? (
        <div className="lumen-toast" role="status" aria-live="polite">{toast}</div>
      ) : null}
    </div>
  )
}
