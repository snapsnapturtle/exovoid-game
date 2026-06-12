interface LoadingBarProps {
  /** Whether the indeterminate fill is animating. When false, nothing paints. */
  active: boolean
  /** Extra classes on the track (e.g. positioning at the call site). */
  className?: string
}

/**
 * A thin indeterminate loading bar. The fill grows in from the left, fills the
 * track, then recedes off to the right on a loop (no real progress to report,
 * so it's a continuous sweep). Purely decorative — it stays `aria-hidden`; when
 * an announcement is needed, pair it with a separate labelled `role="status"`
 * element (the _app layout renders one alongside it for navigation).
 *
 * The track is transparent and only 2px tall; it paints nothing until `active`.
 * Animation lives in the `.loading-bar-sweep` rule in app.css.
 */
export function LoadingBar({ active, className = '' }: LoadingBarProps) {
  return (
    <div
      aria-hidden
      className={`relative h-0.5 w-full overflow-hidden ${className}`}
    >
      {active && (
        <div className="loading-bar-sweep absolute inset-0 bg-accent-400" />
      )}
    </div>
  )
}
