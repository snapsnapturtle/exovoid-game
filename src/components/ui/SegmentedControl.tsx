import type { ReactNode } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Optional trailing content, e.g. a count. */
  badge?: ReactNode
}

type Size = 'sm' | 'md'

const CONTAINER: Record<Size, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
}

const SEGMENT: Record<Size, string> = {
  sm: 'rounded px-2.5 py-1 text-xs',
  md: 'rounded-lg px-3 py-2 text-sm',
}

const BADGE: Record<Size, string> = {
  sm: 'ml-1.5 text-[11px]',
  md: 'ml-2 text-xs',
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: Size
  className?: string
}

/**
 * A gray segmented toggle: a bordered track on `background-200` with the
 * selected segment filled `gray-400`. Segments split the width evenly. Used for
 * two-or-more mutually-exclusive choices (inventory Mine/Party, dice
 * Exovoid/Standard). Pass `badge` on an option to show a trailing count.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 border border-gray-400 bg-background-200 p-1 ${CONTAINER[size]} ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 font-medium transition ${SEGMENT[size]} ${
              active
                ? 'bg-gray-400 text-white'
                : 'text-gray-900 hover:bg-gray-100 hover:text-white'
            }`}
          >
            {opt.label}
            {opt.badge != null && (
              <span
                className={`${BADGE[size]} ${active ? 'text-gray-900' : 'text-gray-700'}`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
