import type { HTMLAttributes, ReactNode } from 'react'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'
type CardAs = 'div' | 'section' | 'article'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: CardPadding
  as?: CardAs
  children?: ReactNode
}

const PADDING_CLASS: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({
  padding = 'md',
  as = 'div',
  className,
  children,
  ...rest
}: CardProps): React.ReactElement {
  const cls: string = ['lumen-card', PADDING_CLASS[padding], className ?? '']
    .filter((s) => s !== '')
    .join(' ')

  if (as === 'section') {
    return (
      <section className={cls} {...rest}>
        {children}
      </section>
    )
  }
  if (as === 'article') {
    return (
      <article className={cls} {...rest}>
        {children}
      </article>
    )
  }
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}

export default Card
