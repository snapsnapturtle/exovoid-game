import type { ReactNode } from 'react'

export type AlertVariant =
  'danger' | 'warning' | 'info' | 'success' | 'pink' | 'neutral'

const VARIANT: Record<AlertVariant, string> = {
  danger: 'border-danger-400 bg-danger-200 text-danger-900',
  warning: 'border-warning-400 bg-warning-200 text-warning-900',
  info: 'border-accent-400 bg-accent-200 text-accent-900',
  success: 'border-success-400 bg-success-200 text-success-900',
  pink: 'border-pink-400 bg-pink-200 text-pink-900',
  neutral: 'border-gray-400 bg-background-100 text-gray-900',
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
