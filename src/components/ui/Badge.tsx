import type { ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'warning'
  | 'danger'
  | 'success'
  | 'purple'
export type BadgeSize = 'xs' | 'sm'

// Tones follow the documented ramp semantic (CLAUDE.md): a badge is a small
// always-visible element, so it sits on the component-bg position (200), takes
// the default border (400), and uses secondary-text (900). One tone family per
// row keeps the colour reading intentional rather than nudged. A selected
// selectable badge reuses exactly this filled look — "lit up in its tone" *is*
// the on state.
const TONE: Record<BadgeTone, string> = {
  neutral: 'border-gray-400 bg-gray-200 text-gray-900',
  accent: 'border-accent-400 bg-accent-200 text-accent-900',
  warning: 'border-warning-400 bg-warning-200 text-warning-900',
  danger: 'border-danger-400 bg-danger-200 text-danger-900',
  success: 'border-success-400 bg-success-200 text-success-900',
  purple: 'border-purple-400 bg-purple-200 text-purple-900',
}

// Unselected state of a selectable badge: a muted outline that fills on hover.
// The absence of tone (vs the filled selected look) is the off signal.
const UNSELECTED =
  'border-gray-400 bg-transparent text-gray-900 not-disabled:hover:bg-gray-100 not-disabled:hover:text-gray-1000'

// Hover treatment for the dismiss ✕ — step one position lighter on bg and to
// primary-text, scoped per tone so the affordance stays in-family.
const DISMISS_HOVER: Record<BadgeTone, string> = {
  neutral: 'not-disabled:hover:bg-gray-300 not-disabled:hover:text-gray-1000',
  accent:
    'not-disabled:hover:bg-accent-300 not-disabled:hover:text-accent-1000',
  warning:
    'not-disabled:hover:bg-warning-300 not-disabled:hover:text-warning-1000',
  danger:
    'not-disabled:hover:bg-danger-300 not-disabled:hover:text-danger-1000',
  success:
    'not-disabled:hover:bg-success-300 not-disabled:hover:text-success-1000',
  purple:
    'not-disabled:hover:bg-purple-300 not-disabled:hover:text-purple-1000',
}

// Heights land on the shared control scale (CLAUDE.md): xs 20px, sm 24px,
// matching the same-named Button sizes so a badge lines up with xs/sm buttons
// in a row. Same mechanism as Button — outer height = line-height + 2·py + 2px
// border (the badge always carries a 1px border), so the `py`/text values are
// the button's verbatim. text-[10px] is an arbitrary size and carries no
// default leading, hence the explicit /[14px].
const SIZE: Record<BadgeSize, string> = {
  xs: 'gap-1 py-[2px] text-[10px]/[14px]',
  sm: 'gap-1 py-[3px] text-xs',
}

// Horizontal padding matches a normal badge on every side except the dismiss
// edge: with a ✕ shown the right pad drops to 2px (pr-0.5) since the icon
// button's own centering already supplies the visual space.
const PADX: Record<BadgeSize, { default: string; dismissible: string }> = {
  xs: { default: 'px-1.5', dismissible: 'pl-1.5 pr-0.5' },
  sm: { default: 'px-2', dismissible: 'pl-2 pr-0.5' },
}

interface BadgeProps {
  /** Colour family — picks bg/border/text from one ramp. Drives the static look and a selectable badge's *selected* state. Defaults to neutral gray. */
  tone?: BadgeTone
  /** Control-scale height: xs (20px, text-[10px], default) or sm (24px, text-xs). Matches xs/sm buttons. */
  size?: BadgeSize
  /** Fully rounded (status pills, Level X) vs the default rounded rectangle. */
  pill?: boolean
  /** Status-badge treatment: uppercase + tracking + semibold. Off = plain label casing. */
  uppercase?: boolean
  /** Pass to make the badge a selection toggle. It renders as a button with aria-pressed; `selected` drives the lit/muted look. */
  onClick?: () => void
  /** Toggle state for a selectable badge (onClick set). Lit in `tone` when true, muted outline when false. */
  selected?: boolean
  /** Disables a selectable badge (onClick set). */
  disabled?: boolean
  /** When provided, renders a trailing ✕ that calls this — turns the badge into a dismissible tag. Not combinable with onClick. */
  onDismiss?: () => void
  /** Accessible label for the ✕ (e.g. "Remove Flow"). Required-ish when onDismiss is set. */
  dismissLabel?: string
  /** Disables the ✕ without hiding it (e.g. while a remove is in flight). */
  dismissDisabled?: boolean
  /** Native title tooltip. */
  title?: string
  className?: string
  children: ReactNode
}

/**
 * Small inline label with three modes:
 * - **Static** — a status badge, count pill, or type tag.
 * - **Selectable** (`onClick`) — a toggle the user clicks on/off (spend Edge,
 *   apply a pending bonus, absorb a support contribution). Renders as a button
 *   with `aria-pressed`; selection reads as the badge lighting up in its tone.
 * - **Dismissible** (`onDismiss`) — a removable tag with a trailing ✕.
 *
 * Chrome only: leading glyphs, counts, and ± modifiers go in `children`. The
 * favourite-skill star and the malfunction-table slot grid are intentional
 * one-offs and don't route through this primitive.
 */
export function Badge({
  tone = 'neutral',
  size = 'xs',
  pill = false,
  uppercase = false,
  onClick,
  selected = false,
  disabled = false,
  onDismiss,
  dismissLabel,
  dismissDisabled = false,
  title,
  className = '',
  children,
}: BadgeProps) {
  const shape = pill ? 'rounded-full' : 'rounded'
  const text = uppercase ? 'font-semibold uppercase tracking-wide' : ''
  const padX = onDismiss ? PADX[size].dismissible : PADX[size].default
  const base = `inline-flex items-center border ${SIZE[size]} ${padX} ${shape} ${text}`

  // Selectable: a real button so the toggle is keyboard- and SR-accessible.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        title={title}
        className={`${base} transition-colors not-disabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
          selected ? TONE[tone] : UNSELECTED
        } ${className}`}
      >
        {children}
      </button>
    )
  }

  // Static, optionally dismissible.
  return (
    <span title={title} className={`${base} ${TONE[tone]} ${className}`}>
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          disabled={dismissDisabled}
          aria-label={dismissLabel}
          title={dismissLabel}
          className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${DISMISS_HOVER[tone]}`}
        >
          <IconX size={11} stroke={2.5} aria-hidden />
        </button>
      )}
    </span>
  )
}
