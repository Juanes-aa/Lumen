import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { ButtonVariant, ButtonSize } from './Button'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  'aria-label': string
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-amber text-amber-dark hover:opacity-90',
  secondary: 'border-[0.5px] border-borde text-celuloide hover:border-borde-soft',
  ghost: 'text-gray-mid hover:text-celuloide hover:bg-pantalla',
  danger: 'text-warn hover:bg-[rgba(226,75,74,0.08)]',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
}

const FOCUS_CLASS: string =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber'

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'ghost', size = 'md', className, type, disabled, ...rest },
  ref,
) {
  const cls: string = [
    'inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer',
    SIZE_CLASS[size],
    VARIANT_CLASS[variant],
    FOCUS_CLASS,
    className ?? '',
  ]
    .filter((s) => s !== '')
    .join(' ')

  return (
    <button ref={ref} type={type ?? 'button'} className={cls} disabled={disabled} {...rest}>
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </button>
  )
})

export default IconButton
