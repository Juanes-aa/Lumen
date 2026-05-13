import type { CSSProperties } from 'react'

type SkeletonVariant = 'rect' | 'text' | 'circle'

export interface SkeletonProps {
  variant?: SkeletonVariant
  width?: number | string
  height?: number | string
  className?: string
}

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  rect: 'rounded-md',
  text: 'rounded-sm',
  circle: 'rounded-full',
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className,
}: SkeletonProps): React.ReactElement {
  const style: CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '0.9em' : undefined),
  }
  const cls: string = [
    'bg-pantalla-soft border-[0.4px] border-borde animate-pulse',
    VARIANT_CLASS[variant],
    className ?? '',
  ]
    .filter((s) => s !== '')
    .join(' ')
  return <div className={cls} style={style} aria-hidden="true" />
}

export default Skeleton
