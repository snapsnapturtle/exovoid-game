import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'ghost'
  | 'ghostDanger'
  | 'danger'
export type ButtonSize = 'xs' | 'sm' | 'md'

// Every variant carries a 1px border so the box model is identical across all
// of them — borderless variants set `border-transparent`, only `secondary`
// colours it. The border *colour* lives on each variant (not the base): two
// `border-color` utilities competing across base+variant are resolved by CSS
// source order, not class-attribute order, so a shared `border-transparent`
// base would silently beat `secondary`'s colour. The base owns only the border
// *width*. Filled variants stay seamless because `background-clip` defaults to
// `border-box`, so their fill paints under the transparent border. This is what
// lets a single SIZE map (below) produce one outer height per size, regardless
// of variant. See the "Control heights" section in CLAUDE.md.
const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-accent-700 text-white not-disabled:hover:bg-accent-800 disabled:opacity-50',
  secondary:
    'border-accent-700/60 bg-accent-700/15 text-accent-900 not-disabled:hover:bg-accent-700/25 disabled:opacity-40',
  subtle:
    'border-transparent bg-gray-400 text-gray-1000 not-disabled:hover:bg-gray-500 disabled:opacity-40',
  ghost:
    'border-transparent text-gray-1000 not-disabled:hover:bg-gray-100 not-disabled:hover:text-white disabled:opacity-50',
  ghostDanger:
    'border-transparent text-danger-900 not-disabled:hover:bg-danger-100 disabled:opacity-50',
  danger:
    'border-transparent bg-danger-700 text-white not-disabled:hover:bg-danger-800 disabled:opacity-50',
}

// Vertical padding is border-compensated: outer height = line-height + 2·py +
// 2px border. With the always-present border (see VARIANT) these land at
// xs 20px / sm 24px / md 32px. The `py`/text values are shared verbatim with
// the Input primitive so a button and an input at the same size align.
const SIZE: Record<ButtonSize, string> = {
  xs: 'px-1.5 py-[2px] text-[10px]/[14px]',
  sm: 'px-2.5 py-[3px] text-xs',
  md: 'px-3 py-[5px] text-sm font-medium',
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
  return `inline-flex items-center justify-center rounded-lg border transition-colors not-disabled:active:scale-[0.98] disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]}`
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
