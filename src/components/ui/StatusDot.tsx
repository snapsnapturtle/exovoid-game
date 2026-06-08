export type StatusDotTone =
  | 'neutral'
  | 'accent'
  | 'warning'
  | 'danger'
  | 'success'
  | 'purple'

// A status dot is a small always-visible solid pip, so it takes the
// high-contrast fill position (700) of its ramp rather than the muted
// component-bg (200) a Badge sits on — the dot has no label to lean on, so it
// needs the saturated tone to read at a glance.
const TONE: Record<StatusDotTone, string> = {
  neutral: 'bg-gray-700',
  accent: 'bg-accent-700',
  warning: 'bg-warning-700',
  danger: 'bg-danger-700',
  success: 'bg-success-700',
  purple: 'bg-purple-700',
}

interface StatusDotProps {
  /** Colour family — picks the fill from one ramp. Defaults to success (green). */
  tone?: StatusDotTone
  /**
   * Accessible label for what the dot signals (e.g. "Active"). Rendered as
   * sr-only text plus a native title tooltip so the meaning survives for
   * screen-reader and hover users even though the dot itself is silent.
   * Omit only for purely decorative dots.
   */
  label?: string
  className?: string
}

/**
 * A small solid status pip — the minimal stand-in for a status Badge when the
 * surrounding context already names the thing and only an at-a-glance on/off
 * signal is needed (e.g. the active combatant in the tracker).
 */
export function StatusDot({
  tone = 'success',
  label,
  className = '',
}: StatusDotProps) {
  return (
    <span
      title={label}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${TONE[tone]} ${className}`}
    >
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
