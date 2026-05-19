import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'ghost'
  | 'danger'
export type ButtonSize = 'sm' | 'md'

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-700 text-white not-disabled:hover:bg-accent-800 disabled:opacity-50',
  secondary:
    'border border-accent-700/60 bg-accent-700/15 text-accent-900 not-disabled:hover:bg-accent-700/25 disabled:opacity-40',
  subtle:
    'bg-gray-400 text-gray-1000 not-disabled:hover:bg-gray-500 disabled:opacity-40',
  ghost:
    'text-gray-1000 not-disabled:hover:bg-gray-100 not-disabled:hover:text-white disabled:opacity-50',
  danger:
    'bg-danger-700 text-white not-disabled:hover:bg-danger-800 disabled:opacity-50',
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
  return `inline-flex items-center justify-center rounded-lg transition not-disabled:active:scale-[0.98] disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]}`
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
