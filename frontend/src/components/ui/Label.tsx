import type { LabelHTMLAttributes, ReactNode } from 'react'

export interface LabelProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'> {
  htmlFor: string
  children: ReactNode
}

export function Label({ htmlFor, className, children, ...rest }: LabelProps): React.ReactElement {
  const cls: string = [
    "font-mono text-[11px] text-gray-mid uppercase tracking-[0.12em] block mb-2",
    className ?? '',
  ]
    .filter((s) => s !== '')
    .join(' ')
  return (
    <label htmlFor={htmlFor} className={cls} {...rest}>
      {children}
    </label>
  )
}

export default Label
