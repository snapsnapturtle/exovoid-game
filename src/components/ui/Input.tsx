import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'rounded px-2 py-1 text-sm',
  md: 'rounded-lg px-3 py-2 text-sm',
  lg: 'rounded-lg px-4 py-2 text-base',
}

// 1px gray hairline at rest; on focus the border swaps to accent-700 and a
// matching 1px accent halo sits outside it via box-shadow, so the total visual
// frame is 2px without nudging the box model. Focus is gated behind
// `not-disabled:` so its selector specificity matches the hover rule above
// (`:not(:disabled):hover` would otherwise outrank a bare `:focus`).
const BASE =
  'border border-gray-400 bg-background-100 text-white placeholder-gray-700 ' +
  'transition-[border-color,box-shadow] ' +
  'not-disabled:hover:border-gray-500 ' +
  'not-disabled:focus:outline-none not-disabled:focus:border-accent-700 not-disabled:focus:shadow-[0_0_0_1px_var(--color-accent-700)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

function inputClasses(size: Size, extra?: string): string {
  return `${BASE} ${SIZE_CLASSES[size]}${extra ? ` ${extra}` : ''}`
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: Size
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', className, ...rest },
  ref,
) {
  return <input ref={ref} className={inputClasses(size, className)} {...rest} />
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  size?: Size
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ size = 'md', className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={inputClasses(size, className)}
        {...rest}
      />
    )
  },
)

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  size?: Size
}

// Strip the native OS arrow and draw our own chevron via `.select-chevron`
// (defined in app.css). Right padding leaves room for it so the value text
// doesn't slide under the icon.
const SELECT_EXTRA = 'appearance-none pr-8 select-chevron'

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ size = 'md', className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={inputClasses(
          size,
          className ? `${SELECT_EXTRA} ${className}` : SELECT_EXTRA,
        )}
        {...rest}
      >
        {children}
      </select>
    )
  },
)
