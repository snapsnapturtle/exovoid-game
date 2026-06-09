import type { ReactNode } from 'react'

interface EmptyStateProps {
  /**
   * A single icon (e.g. a Tabler icon). Forced to 32×32 with a thinned 1.5
   * stroke regardless of the icon's own props, and rendered inside a
   * bordered, rounded chip that mirrors the container's chrome.
   */
  icon: ReactNode
  /** Short heading — what's empty / not yet set up. */
  title: string
  /** A sentence of supporting context: why it's empty or what to do next. */
  description?: ReactNode
  /**
   * Optional call to action, shown below the description. Pass a
   * `<Button variant="subtle">` (md) — e.g. "Add weapon", "Start combat".
   */
  action?: ReactNode
  className?: string
}

/**
 * The canonical "nothing here yet" panel: a bordered card with a centred
 * icon chip, a title, a description, and an optional action. Reach for this
 * instead of hand-rolling a centered message box so empty states read
 * identically across the app.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-gray-400 bg-background-200 px-6 py-10 text-center ${className}`}
    >
      <div className="inline-flex items-center justify-center rounded-xl border border-gray-400 p-2.5 text-gray-900 [&>svg]:h-8 [&>svg]:w-8 [&>svg]:[stroke-width:1.5]">
        {icon}
      </div>
      <p className="mt-4 text-base font-semibold text-gray-1000">{title}</p>
      {description && (
        <div className="mt-1.5 max-w-sm text-sm text-gray-900">
          {description}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
