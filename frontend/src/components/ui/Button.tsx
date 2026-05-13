import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Spinner from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children?: ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'lumen-btn-primary',
  secondary: 'lumen-btn-secondary',
  ghost: 'lumen-btn-ghost',
  danger: 'lumen-btn-danger',
}

const FOCUS_CLASS: string =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, type, ...rest },
  ref,
) {
  const sizeCls: string = size === 'sm' && variant !== 'ghost' ? 'sm' : ''
  const cls: string = [VARIANT_CLASS[variant], sizeCls, FOCUS_CLASS, className ?? '']
    .filter((s) => s !== '')
    .join(' ')

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cls}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Spinner size="sm" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
})

export default Button
