import type { InputHTMLAttributes, ReactNode } from 'react'
import { IconCheck } from '@tabler/icons-react'

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> {
  /** Optional text/label rendered beside the box. When set, the whole thing is wrapped in a <label> so clicking the text toggles. */
  label?: ReactNode
  /** Class for the wrapping <label> (layout). */
  className?: string
  /** Class for the box itself (rarely needed). */
  boxClassName?: string
}

/**
 * Themed checkbox. Keeps a real `<input type="checkbox">` (so focus, keyboard,
 * label association and form semantics come for free) but hides the browser
 * chrome with `appearance-none` and draws a dark-theme box: gray-400 hairline
 * on transparent, filling to accent-700 when checked, with a tabler IconCheck
 * overlaid via `peer-checked`. Focus shows the accent halo like other inputs.
 */
export function Checkbox({
  label,
  className = '',
  boxClassName = '',
  disabled,
  ...rest
}: CheckboxProps) {
  const box = (
    <span className="relative inline-flex shrink-0">
      <input
        type="checkbox"
        disabled={disabled}
        className={`peer h-4 w-4 appearance-none rounded border border-gray-400 bg-transparent transition-colors duration-75 ease-out not-checked:not-disabled:hover:border-gray-500 checked:border-accent-700 checked:bg-accent-700 checked:not-disabled:hover:border-accent-800 checked:not-disabled:hover:bg-accent-800 focus-visible:border-accent-700 focus-visible:shadow-[0_0_0_1px_var(--color-accent-700)] focus-visible:outline-none disabled:cursor-not-allowed ${boxClassName}`}
        {...rest}
      />
      <IconCheck
        size={12}
        stroke={3}
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto scale-50 text-white opacity-0 transition duration-75 ease-out peer-checked:scale-100 peer-checked:opacity-100"
      />
    </span>
  )

  if (label == null) {
    return disabled ? <span className="opacity-50">{box}</span> : box
  }

  return (
    <label
      className={`inline-flex items-center gap-2 text-sm text-gray-1000 ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`}
    >
      {box}
      <span>{label}</span>
    </label>
  )
}
