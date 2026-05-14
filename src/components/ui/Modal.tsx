import type { MouseEventHandler, ReactNode } from 'react'

/**
 * Standard close affordance for any dialog: a small "×" in the top-right
 * corner. Every modal in the app should render this — text "Close"
 * buttons in the footer are reserved for the *cancel* role next to a
 * confirm action.
 */
export function ModalCloseButton({
  onClose,
}: {
  onClose: MouseEventHandler<HTMLButtonElement>
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 transition hover:bg-void-700 hover:text-white"
    >
      ✕
    </button>
  )
}

interface ModalProps {
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  align?: 'start' | 'center'
  footer?: ReactNode
  children: ReactNode
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
}

/**
 * Generic modal chrome: full-screen backdrop, centered card, header with
 * optional title/subtitle and a required X close, optional footer for
 * action buttons. Callers fill in only the body content.
 */
export function Modal({
  onClose,
  title,
  subtitle,
  size = 'md',
  align = 'start',
  footer,
  children,
}: ModalProps) {
  const alignClass = align === 'center' ? 'items-center' : 'items-start'
  return (
    <div
      className={`fixed inset-0 z-50 flex ${alignClass} justify-center bg-black/60 p-4 sm:p-8`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[90vh] w-full ${SIZE[size]} flex-col rounded-xl border border-void-600 bg-void-800 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-void-700 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
            )}
          </div>
          <ModalCloseButton onClose={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-void-700 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
