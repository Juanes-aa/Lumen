import type { CSSProperties } from 'react'

export type PosterRounded = 'none' | 'sm' | 'md'

interface PosterCommon {
  url: string | null
  alt: string
  rounded?: PosterRounded
  className?: string
}

export type PosterProps =
  | (PosterCommon & { width: number; height: number; fluid?: never })
  | (PosterCommon & { fluid: true; width?: never; height?: never })

const ROUNDED_CLASS: Record<PosterRounded, string> = {
  none: '',
  sm: 'rounded-[4px]',
  md: 'rounded-md',
}

export function Poster(props: PosterProps): React.ReactElement {
  const { url, alt, rounded = 'sm', className } = props
  const roundedCls: string = ROUNDED_CLASS[rounded]

  const sizingCls: string = 'fluid' in props && props.fluid === true ? 'w-full aspect-[2/3]' : ''
  const sizingStyle: CSSProperties =
    'width' in props && typeof props.width === 'number'
      ? { width: props.width, height: props.height }
      : {}

  const wrapperCls: string = [
    'relative overflow-hidden shrink-0 bg-pantalla-soft border-[0.4px] border-borde',
    roundedCls,
    sizingCls,
    className ?? '',
  ]
    .filter((s) => s !== '')
    .join(' ')

  if (url !== null) {
    return (
      <div className={wrapperCls} style={sizingStyle}>
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  const initial: string = alt.trim() !== '' ? alt.trim().charAt(0).toUpperCase() : ''
  return (
    <div
      className={`${wrapperCls} flex items-center justify-center`}
      style={sizingStyle}
      role="img"
      aria-label={alt}
    >
      <span
        aria-hidden="true"
        className="font-serif text-gray-mid select-none"
        style={{ fontSize: '40%' }}
      >
        {initial}
      </span>
    </div>
  )
}

export default Poster
