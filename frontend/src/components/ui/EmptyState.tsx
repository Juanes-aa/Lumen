import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  const cls: string = [
    'flex flex-col items-center text-center px-6 py-8 bg-pantalla-soft border-[0.4px] border-borde rounded-[10px]',
    className ?? '',
  ]
    .filter((s) => s !== '')
    .join(' ')
  return (
    <div className={cls}>
      {icon !== undefined ? <div className="mb-3 text-gray-mid">{icon}</div> : null}
      <p className="font-serif italic text-celuloide text-lg leading-snug mb-3">{title}</p>
      {description !== undefined && description !== '' ? (
        <p className="font-sans text-[13px] text-gray-mid leading-relaxed mb-4 max-w-md">
          {description}
        </p>
      ) : null}
      {action !== undefined ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

export default EmptyState
