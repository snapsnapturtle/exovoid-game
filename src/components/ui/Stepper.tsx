import type { ReactNode } from 'react'
import { Button } from '~/components/ui/Button'

export type StepperSize = 'sm' | 'md'
export type StepperValueTone = 'default' | 'accent' | 'danger'

const VALUE_SIZE: Record<StepperSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
}

const TONE: Record<StepperValueTone, string> = {
  default: 'text-white',
  accent: 'text-accent-900',
  danger: 'text-danger-900',
}

interface StepperProps {
  label?: ReactNode
  value: number
  /** Soft target shown as "/ max"; also bounds the + button unless overridden. */
  max?: number
  /** Hard upper bound for the + button (defaults to `max`). */
  hardMax?: number
  /** Hard lower bound for the − button. Omit to allow unbounded decrement (e.g. negative AP). */
  min?: number
  onAdjust: (delta: number) => void
  canEdit?: boolean
  busy?: boolean
  size?: StepperSize
  valueTone?: StepperValueTone
}

/**
 * Shared label + value + adjust-by-one stepper. Used both on the
 * character sheet's Health/Edge band and inside each combat-tracker
 * participant card. Renders the controls only — the caller wraps in
 * whatever surface chrome it wants.
 */
export function Stepper({
  label,
  value,
  max,
  hardMax,
  min,
  onAdjust,
  canEdit = true,
  busy = false,
  size = 'sm',
  valueTone = 'default',
}: StepperProps) {
  const ceiling = hardMax ?? max
  const stepBtnClass = 'h-7 w-7 shrink-0 px-0 py-0 text-base'
  return (
    <div className="flex flex-col rounded-lg border border-gray-400 bg-background-100/40 p-2">
      {label !== undefined && (
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-700">
          {label}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="subtle"
          size="sm"
          onClick={() => onAdjust(-1)}
          disabled={!canEdit || busy || (min !== undefined && value <= min)}
          aria-label="Decrease"
          className={stepBtnClass}
        >
          −
        </Button>
        <span
          className={`font-semibold leading-none ${VALUE_SIZE[size]} ${TONE[valueTone]}`}
        >
          {value}
          {max !== undefined && (
            <span className="ml-1 text-xs text-gray-700">/ {max}</span>
          )}
        </span>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => onAdjust(1)}
          disabled={
            !canEdit || busy || (ceiling !== undefined && value >= ceiling)
          }
          aria-label="Increase"
          className={stepBtnClass}
        >
          +
        </Button>
      </div>
    </div>
  )
}
