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

function StatsRow({
  moviesCount,
  totalAnalyzed,
  activeSessionsCount,
  topicsCount,
}: StatsRowProps): React.ReactElement {
  const stats: { label: string; value: number }[] = [
    { label: 'Películas vistas', value: moviesCount },
    { label: 'Análisis cerrados', value: totalAnalyzed },
    { label: 'Sesiones activas', value: activeSessionsCount },
    { label: 'Temas explorados', value: topicsCount },
  ]
  return (
    <section className="lumen-anim-4 lumen-section bg-pantalla-soft">
      <span className="lumen-overline mb-4">Actividad</span>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="font-serif text-[28px] font-normal text-celuloide leading-none">
              {stat.value}
            </p>
            <p className="font-mono text-[10px] text-gray-mid tracking-[0.06em] mt-1">
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
    <div className="flex-1 px-11 py-9 overflow-y-auto">
      <div className="h-8 w-[200px] bg-pantalla rounded-[4px] mb-7 animate-pulse" />
      <div className="flex gap-6">
        <div className="basis-3/5 grow-0 shrink-0 flex flex-col gap-[18px]">
          {[200, 200, 180].map((h, i) => (
            <div
              key={i}
              className="bg-pantalla rounded-[10px] animate-pulse"
              style={{ height: h }}
            />
          ))}
        </div>
        <div className="basis-2/5 grow-0 shrink-0 flex flex-col gap-[18px]">
          {[180, 140, 140].map((h, i) => (
            <div
              key={i}
              className="bg-pantalla rounded-[10px] animate-pulse"
              style={{ height: h }}
            />
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
  // Triggered for cache priming so the sub-sections paint together
  useMemoryNotesQuery()

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  function showToast(message: string): void {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current)
    }
    setToast(message)
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
    }, 2200)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current)
      }
    }
  }, [])

  const initialLoading: boolean =
    profileQuery.isPending || sessionsQuery.isPending || moviesQuery.isPending

  if (initialLoading) {
    return <ProfileSkeleton />
  }

  const profile = profileQuery.data ?? null
  const sessions = sessionsQuery.data ?? []
  const moviesCount: number = (moviesQuery.data ?? []).length
  const totalAnalyzed: number = profile?.total_sesiones_analizadas ?? 0
  const activeSessionsCount: number = sessions.filter((s) => s.status === 'active').length
  const topicsCount: number = (profile?.temas_frecuentes ?? []).length

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Header */}
      <header className="lumen-anim-1 px-11 pt-9 pb-7 shrink-0">
        <h1 className="font-serif text-[32px] font-medium text-celuloide tracking-[-0.02em] mb-[6px]">
          Perfil
        </h1>
        <p className="font-mono text-[11px] text-gray-mid tracking-[0.06em]">
          {totalAnalyzed === 0
            ? 'Aún no tienes análisis cerrados'
            : `${totalAnalyzed.toString()} ${totalAnalyzed === 1 ? 'película analizada' : 'películas analizadas'}`}
        </p>
      </header>

      <div className="flex flex-1 pb-12 min-h-0">
        {/* Left column 60% */}
        <div className="basis-3/5 grow-0 shrink-0 px-11 flex flex-col gap-6 min-w-0">
          <SemanticProfileSection />
          <InstructionsSection onToast={showToast} />
          <MemorySection onToast={showToast} />
        </div>

        {/* Right column 40% */}
        <aside className="basis-2/5 grow-0 shrink-0 pl-6 pr-11 border-l-[0.4px] border-borde flex flex-col gap-6 min-w-0">
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
        <div className="lumen-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
