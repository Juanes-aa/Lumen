import { ApiError } from '../../api/client'
import Button from './Button'

export interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
  className?: string
}

function describe(error: unknown): { headline: string; detail: string | null } {
  if (error instanceof ApiError) {
    return {
      headline: `HTTP ${error.status.toString()}`,
      detail: error.detail !== '' ? error.detail : error.message,
    }
  }
  if (error instanceof Error) {
    return { headline: error.name, detail: error.message }
  }
  return { headline: 'Error', detail: null }
}

export function ErrorState({
  error,
  onRetry,
  title = 'Algo se rompió al cargar.',
  className,
}: ErrorStateProps): React.ReactElement {
  const { headline, detail } = describe(error)
  const cls: string = [
    'flex flex-col items-center text-center px-6 py-8 bg-pantalla-soft border-[0.4px] border-borde rounded-[10px]',
    className ?? '',
  ]
    .filter((s) => s !== '')
    .join(' ')
  return (
    <div className={cls} role="alert">
      <p className="font-serif italic text-celuloide text-lg leading-snug mb-2">{title}</p>
      <p className="font-mono text-[10px] text-gray-mid uppercase tracking-wider mb-1">
        {headline}
      </p>
      {detail !== null && detail !== '' ? (
        <p className="font-sans text-[13px] text-gray-mid leading-relaxed mb-4 max-w-md break-words">
          {detail}
        </p>
      ) : null}
      {onRetry !== undefined ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}

export default ErrorState
