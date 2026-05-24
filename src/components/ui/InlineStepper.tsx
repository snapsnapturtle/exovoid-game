interface InlineStepperProps {
  value: number
  /** Hard lower bound for the − button. Omit to allow unbounded decrement. */
  min?: number
  /** Hard upper bound for the + button. Omit to allow unbounded increment. */
  max?: number
  /** Used to construct the +/- buttons' aria-labels ("Decrease {ariaLabel}"). */
  ariaLabel: string
  /** Width class for the value display (default `min-w-[2ch]`). Override
   * when values can hit 2+ digits and you want them right-aligned in a
   * fixed lane (e.g. `w-6 text-right`). */
  valueClassName?: string
  canEdit?: boolean
  onAdjust: (delta: number) => void
}

/**
 * Tiny in-row [− value +] stepper used for attribute/skill/XP edits where
 * the bigger `<Stepper>` card would be visually too heavy. Buttons are
 * 20px (CLAUDE.md "in-row micro-buttons" recipe). Caller provides the
 * surrounding label/layout chrome.
 */
export function InlineStepper({
  value,
  min,
  max,
  ariaLabel,
  valueClassName = 'min-w-[2ch] text-center text-sm font-medium text-white',
  canEdit = true,
  onAdjust,
}: InlineStepperProps) {
  if (!canEdit) {
    return <span className={valueClassName}>{value}</span>
  }
  const minusBtn =
    'flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30'
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        disabled={min !== undefined && value <= min}
        aria-label={`Decrease ${ariaLabel}`}
        className={minusBtn}
      >
        −
      </button>
      <span className={valueClassName}>{value}</span>
      <button
        type="button"
        onClick={() => onAdjust(1)}
        disabled={max !== undefined && value >= max}
        aria-label={`Increase ${ariaLabel}`}
        className={minusBtn}
      >
        +
      </button>
    </span>
  )
}
