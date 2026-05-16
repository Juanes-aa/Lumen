import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useSessionsQuery, useWatchedMoviesQuery, useSemanticProfileQuery } from '../api/queries'
import Poster from '../components/ui/Poster'
import Button from '../components/ui/Button'
import RecentMoviesRow from './dashboard/RecentMoviesRow'
import ProgressCard from './dashboard/ProgressCard'
import RecommendationsTeaser from './dashboard/RecommendationsTeaser'
import { useIsMobile } from '../hooks/useIsMobile'
import type { SessionSummary } from '../types/analysis'
import type { WatchedMovie } from '../types/library'

function greeting(): string {
  const h: number = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function relativeTime(dateStr: string | null): string {
  if (dateStr === null) return ''
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'hace 1 día'
  if (diffDays < 7) return `hace ${diffDays} días`
  const weeks = Math.floor(diffDays / 7)
  return weeks === 1 ? 'hace 1 semana' : `hace ${weeks} semanas`
}

interface ActiveSessionCardProps {
  session: SessionSummary
  releaseYear: number | null
  tags: string[]
  onResume: () => void
}

function ActiveSessionCard({ session, releaseYear, tags, onResume }: ActiveSessionCardProps): React.ReactElement {
  return (
    <div
      className="bg-pantalla border-[0.5px] border-amber"
      style={{ borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}
    >
      <div
        className="pointer-events-none"
        style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(250,199,117,0.07) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <Poster url={session.movie_poster_url} alt={session.movie_title} width={52} height={78} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-mono text-amber" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 5 }}>
          En curso
        </p>
        <p className="font-serif text-celuloide" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.movie_title}
        </p>
        <p className="font-mono text-gray-mid" style={{ fontSize: 10.5, letterSpacing: '0.04em' }}>
          {releaseYear !== null ? `${releaseYear} · ` : ''}Continuando sesión…
        </p>
        {tags.length > 0 ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-amber"
                style={{ background: 'rgba(250,199,117,0.08)', border: '0.4px solid rgba(250,199,117,0.25)', borderRadius: 4, fontSize: 9.5, padding: '3px 8px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <Button size="sm" style={{ flexShrink: 0, marginLeft: 8 }} onClick={onResume}>
        Retomar
      </Button>
    </div>
  )
}

export default function DashboardPage(): React.ReactElement | null {
  const token = useAuthStore((s) => s.access_token)
  const navigate = useNavigate()

  const sessionsQuery = useSessionsQuery()
  const moviesQuery = useWatchedMoviesQuery()
  const profileQuery = useSemanticProfileQuery()

  const sessions: SessionSummary[] = sessionsQuery.data ?? []
  const movies: WatchedMovie[] = moviesQuery.data ?? []

  const activeSession: SessionSummary | null = useMemo(
    () => sessions.find((s) => s.status === 'active') ?? null,
    [sessions],
  )

  const lastClosedSession: SessionSummary | null = useMemo(() => {
    const closed = sessions.filter((s) => s.status === 'closed')
    return closed.length > 0 ? closed[0] : null
  }, [sessions])

  const activeMovieYear: number | null = useMemo(() => {
    if (activeSession === null) return null
    const movie = movies.find((m) => m.id === activeSession.movie_id)
    return movie?.release_year ?? null
  }, [activeSession, movies])

  const activeSessionTags: string[] = useMemo(() => {
    if (activeSession === null || !activeSession.has_tags) return []
    return (profileQuery.data?.temas_frecuentes ?? []).slice(0, 2).map((t) => t.value)
  }, [activeSession, profileQuery.data])

  const isMobile = useIsMobile()

  if (token === null) return null

  // ── Secciones compartidas ────────────────────────────────────────────────
  const greeting_ = greeting()

  const welcomeBlock = (
    <div className="lumen-anim-1" style={{ marginBottom: 36 }}>
      <p className="lumen-overline" style={{ marginBottom: 8 }}>{greeting_}</p>
      <h1
        className="font-serif text-celuloide"
        style={{ fontSize: isMobile ? 26 : 32, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8 }}
      >
        ¿Qué estás procesando hoy?
      </h1>
      <p className="font-sans text-gray-mid" style={{ fontSize: 13, lineHeight: 1.6 }}>
        {lastClosedSession !== null ? (
          <>
            Última sesión {relativeTime(lastClosedSession.closed_at)} ·{' '}
            <span className="text-celuloide">{lastClosedSession.movie_title}</span>
          </>
        ) : (
          'Aún no tienes sesiones cerradas.'
        )}
      </p>
    </div>
  )

  const activeBlock = activeSession !== null ? (
    <div className="lumen-anim-2" style={{ marginBottom: 36 }}>
      <p className="lumen-overline" style={{ marginBottom: 12 }}>Análisis en curso</p>
      <ActiveSessionCard
        session={activeSession}
        releaseYear={activeMovieYear}
        tags={activeSessionTags}
        onResume={() => { navigate(`/analysis/${activeSession.id}`) }}
      />
    </div>
  ) : null

  // ── Mobile: columna única con scroll ─────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 32px' }}>
        {welcomeBlock}
        {activeBlock}
        <RecentMoviesRow />
        <div style={{ borderTop: '0.4px solid #2E2D2B', margin: '32px 0 28px' }} />
        <ProgressCard />
        <div style={{ marginTop: 28 }}>
          <RecommendationsTeaser />
        </div>
      </div>
    )
  }

  // ── Desktop: layout original intacto ────────────────────────────────────
  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden', height: '100%' }}>

      {/* Columna principal */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 40px 40px 44px' }}>
        {welcomeBlock}
        {activeBlock}
        <RecentMoviesRow />
      </div>

      {/* Panel derecho */}
      <aside style={{ width: 260, flexShrink: 0, borderLeft: '0.4px solid #2E2D2B', padding: '40px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <ProgressCard />
        <div style={{ borderTop: '0.4px solid #2E2D2B' }} />
        <RecommendationsTeaser />
      </aside>
    </div>
  )
}
