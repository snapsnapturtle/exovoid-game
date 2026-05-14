import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-500 text-white hover:bg-accent-400 disabled:opacity-50',
  secondary:
    'border border-accent-500/60 bg-accent-500/15 text-accent-200 hover:bg-accent-500/25 disabled:opacity-40',
  ghost:
    'border border-void-600 bg-void-700 text-gray-300 hover:border-accent-500 hover:text-white disabled:opacity-50',
  danger:
    'border border-danger-500/60 bg-danger-500/10 text-danger-400 hover:bg-danger-500/20 disabled:opacity-50',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm font-medium',
}

/**
 * Class string for a styled affordance — use when you need to render a
 * non-button element (e.g. a `<Link>`) with the same visual treatment.
 * For real buttons, use the `<Button>` component instead.
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
): string {
  return `inline-flex items-center justify-center rounded-lg transition ${VARIANT[variant]} ${SIZE[size]}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonClasses(variant, size)} ${className}`}
      {...rest}
    />
  )
}
