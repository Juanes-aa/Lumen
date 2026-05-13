import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  error?: string
}

const FOCUS_CLASS: string =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, error, className, 'aria-describedby': ariaDescribedBy, ...rest },
  ref,
) {
  const errorId: string = `${id}-error`
  const describedBy: string | undefined =
    error !== undefined && error !== ''
      ? [ariaDescribedBy, errorId].filter((s) => s !== undefined && s !== '').join(' ')
      : ariaDescribedBy

  const cls: string = ['lumen-input', FOCUS_CLASS, className ?? ''].filter((s) => s !== '').join(' ')

  return (
    <>
      <input
        ref={ref}
        id={id}
        className={cls}
        aria-invalid={error !== undefined && error !== '' ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error !== undefined && error !== '' ? (
        <span id={errorId} className="text-warn text-xs mt-1 block font-sans">
          {error}
        </span>
      ) : null}
    </>
  )
})

export default Input
