import type { ReactNode } from 'react'

export type AlertVariant = 'danger' | 'warning' | 'info'

const VARIANT: Record<AlertVariant, string> = {
  danger: 'border-danger-500/60 bg-danger-500/10 text-danger-400',
  warning: 'border-warning-500/60 bg-warning-500/15 text-warning-400',
  info: 'border-accent-500/60 bg-accent-500/10 text-accent-300',
}

interface AlertProps {
  variant?: AlertVariant
  className?: string
  children: ReactNode
}

/**
 * Inline status banner — short error or warning message rendered in the
 * flow of a page or modal. For destructive button actions use
 * `<Button variant="danger">`; this component is for standalone messages.
 */
export function Alert({
  variant = 'danger',
  className = '',
  children,
}: AlertProps) {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={`rounded-lg border px-3 py-2 text-sm ${VARIANT[variant]} ${className}`}
    >
      {children}
    </div>
  )
}
