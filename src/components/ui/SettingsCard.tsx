import type { ReactNode } from 'react'

interface SettingsCardProps {
  title: string
  /** Sits under the title, describing the setting. */
  description?: ReactNode
  /** The control(s) — an input, a read-only value, a form body. */
  children: ReactNode
  /** Left-aligned hint in the footer tray (e.g. a constraint or note). */
  footer?: ReactNode
  /** Right-aligned action in the footer tray (e.g. a Save button). */
  action?: ReactNode
}

/**
 * Vercel-style settings block: a bordered card whose body holds a titled
 * setting, with an optional hairline-divided footer "tray" carrying a hint on
 * the left and an action on the right. The tray sits on the darker
 * `background-100` so it reads as a distinct strip beneath the body.
 *
 * For an editable card, wrap the whole `<SettingsCard>` in a `<form>` and pass
 * a submit `<Button>` as `action` — it's inside the form so it still submits.
 */
export function SettingsCard({
  title,
  description,
  children,
  footer,
  action,
}: SettingsCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-400 bg-background-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-900">{description}</p>
        )}
        <div className="mt-4">{children}</div>
      </div>
      {(footer || action) && (
        <div className="flex items-center justify-between gap-4 border-t border-gray-400 bg-background-100 px-6 py-3">
          <div className="min-w-0 text-sm text-gray-700">{footer}</div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </section>
  )
}
