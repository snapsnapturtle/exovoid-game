import { Button } from '~/components/ui/Button'

interface InlineStepperProps {
  value: number
  /** Hard lower bound for the − button. Omit to allow unbounded decrement. */
  min?: number
  /** Hard upper bound for the + button. Omit to allow unbounded increment. */
  max?: number
  /** Used to construct the +/- buttons' aria-labels ("Decrease {ariaLabel}"). */
  ariaLabel: string
  /** Text-styling classes for the value display (size / weight / colour /
   * `tabular-nums`). Spacing is owned by the component (a baked-in `px-1.5`),
   * so don't pass widths here — the readout sizes to its content and the gap to
   * the buttons stays uniform across every stepper. */
  valueClassName?: string
  /** Extra disable condition OR'd with the min bound (e.g. `busy`, or an
   * external "can't go lower" rule that isn't a simple numeric floor). */
  decrementDisabled?: boolean
  /** Extra disable condition OR'd with the max bound. */
  incrementDisabled?: boolean
  canEdit?: boolean
  onAdjust: (delta: number) => void
}

/**
 * Tiny in-row [− value +] stepper used for attribute/skill/XP edits where
 * the bigger `<Stepper>` card would be visually too heavy. Buttons are the
 * shared `xs` Button (20px), squared off at 20×20 via `w-5 px-0`. Caller
 * provides the surrounding label/layout chrome.
 */
export function InlineStepper({
  value,
  min,
  max,
  ariaLabel,
  valueClassName = 'text-sm font-medium text-white',
  decrementDisabled = false,
  incrementDisabled = false,
  canEdit = true,
  onAdjust,
}: InlineStepperProps) {
  // Spacing is component-owned so every stepper reads the same regardless of
  // caller; valueClassName only contributes text styling.
  const valueClasses = `px-1.5 text-center ${valueClassName}`
  if (!canEdit) {
    return <span className={valueClasses}>{value}</span>
  }
  const stepBtnClass = 'w-5 shrink-0 px-0'
  return (
    <span className="inline-flex items-center gap-1">
      <Button
        variant="subtle"
        size="xs"
        onClick={() => onAdjust(-1)}
        disabled={decrementDisabled || (min !== undefined && value <= min)}
        aria-label={`Decrease ${ariaLabel}`}
        className={stepBtnClass}
      >
        −
      </Button>
      <span className={valueClasses}>{value}</span>
      <Button
        variant="subtle"
        size="xs"
        onClick={() => onAdjust(1)}
        disabled={incrementDisabled || (max !== undefined && value >= max)}
        aria-label={`Increase ${ariaLabel}`}
        className={stepBtnClass}
      >
        +
      </Button>
    </span>
  )
}
