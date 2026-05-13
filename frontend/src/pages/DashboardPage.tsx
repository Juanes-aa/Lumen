import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useSessionsQuery, useWatchedMoviesQuery, useSemanticProfileQuery } from '../api/queries'
import Poster from '../components/ui/Poster'
import Button from '../components/ui/Button'
import RecentMoviesRow from './dashboard/RecentMoviesRow'
import ProgressCard from './dashboard/ProgressCard'
import RecommendationsTeaser from './dashboard/RecommendationsTeaser'
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
    <div className="bg-pantalla border-[0.5px] border-amber rounded-[10px] px-5 py-4 flex items-center gap-4 relative overflow-hidden">
      <div
        className="absolute top-[-30px] right-[-30px] w-[120px] h-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(250,199,117,0.07) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <Poster
        url={session.movie_poster_url}
        alt={session.movie_title}
        width={52}
        height={78}
      />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[10px] text-amber tracking-[0.14em] uppercase mb-[5px]">
          En curso
        </p>
        <p className="font-serif text-xl font-medium text-celuloide tracking-[-0.01em] mb-[3px] truncate">
          {session.movie_title}
        </p>
        <p className="font-mono text-[10.5px] text-gray-mid tracking-[0.04em]">
          {releaseYear !== null ? `${releaseYear} · ` : ''}Continuando sesión…
        </p>
        {tags.length > 0 ? (
          <div className="flex gap-[6px] mt-[10px] flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-[rgba(250,199,117,0.08)] border-[0.4px] border-[rgba(250,199,117,0.25)] rounded-[4px] text-amber font-mono text-[9.5px] px-[8px] py-[3px] tracking-[0.06em] whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <Button size="sm" className="shrink-0" onClick={onResume}>
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

  // Show top 2 profile tags as amber chips when the session has tags
  const activeSessionTags: string[] = useMemo(() => {
    if (activeSession === null || !activeSession.has_tags) return []
    return (profileQuery.data?.temas_frecuentes ?? []).slice(0, 2).map((t) => t.value)
  }, [activeSession, profileQuery.data])

  if (token === null) return null

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      {/* Main column */}
      <div className="flex-1 overflow-y-auto px-10 py-10 pl-11">

        {/* Welcome */}
        <div className="lumen-anim-1 mb-9">
          <p className="lumen-overline mb-2">{greeting()}</p>
          <h1 className="font-serif text-[32px] font-medium text-celuloide leading-[1.1] tracking-[-0.02em] mb-2">
            ¿Qué estás procesando hoy?
          </h1>
          <p className="font-sans text-[13px] text-gray-mid leading-relaxed">
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

        {/* Active analysis */}
        {activeSession !== null ? (
          <div className="lumen-anim-2 mb-9">
            <p className="lumen-overline mb-3 tracking-[0.16em]">Análisis en curso</p>
            <ActiveSessionCard
              session={activeSession}
              releaseYear={activeMovieYear}
              tags={activeSessionTags}
              onResume={() => { navigate(`/analysis/${activeSession.id}`) }}
            />
          </div>
        ) : null}

        {/* Recent movies */}
        <RecentMoviesRow />
      </div>

      {/* Right panel */}
      <aside className="w-[260px] shrink-0 border-l-[0.4px] border-borde px-6 py-10 overflow-y-auto flex flex-col gap-8">
        <ProgressCard />
        <div className="border-t-[0.4px] border-borde" />
        <RecommendationsTeaser />
      </aside>
    </div>
  )
}
