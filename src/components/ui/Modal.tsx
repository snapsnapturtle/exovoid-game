import type { MouseEventHandler, ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-900 transition hover:bg-gray-100 hover:text-white"
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
  /**
   * Pinned content between the title header and the scrollable body —
   * search bars, filter pills, status lines. Stays visible while the body
   * scrolls. Wrapped in the standard `border-b border-gray-400 px-5 py-3`
   * chrome; caller passes bare content.
   */
  stickyHeader?: ReactNode
  /**
   * Left-aligned content in the footer (typically inline form fields).
   * When provided, the footer switches from a right-aligned button row
   * to a split layout: `footerLeft` on the left, `footer` on the right.
   */
  footerLeft?: ReactNode
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
  stickyHeader,
  footerLeft,
  footer,
  children,
}: ModalProps) {
  // SSR-safe: skip on the server. Modals only mount in response to user
  // interaction anyway, so the client-only path is fine.
  if (typeof document === 'undefined') return null
  const alignClass = align === 'center' ? 'items-center' : 'items-start'
  return createPortal(
    // Portaled to document.body so the modal isn't a flex/grid child of
    // its caller — otherwise its DOM position would absorb a `gap` /
    // `space-y` allocation in the parent, nudging siblings by a few px
    // even though the modal itself is `position: fixed`.
    <div
      className={`modal-backdrop-in fixed backdrop-blur-sm inset-0 z-50 flex ${alignClass} justify-center bg-black/60 p-4 sm:p-8`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`modal-card-in flex max-h-[90vh] w-full ${SIZE[size]} flex-col rounded-xl border border-gray-400 bg-background-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-400 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-gray-900">{subtitle}</p>
            )}
          </div>
          <ModalCloseButton onClose={onClose} />
        </header>
        {stickyHeader && (
          <div className="border-b border-gray-400 px-5 py-3">
            {stickyHeader}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {(footer || footerLeft) &&
          (footerLeft ? (
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-gray-400 px-5 py-3">
              {footerLeft}
              {footer && <div className="flex gap-2">{footer}</div>}
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 border-t border-gray-400 px-5 py-3">
              {footer}
            </div>
          ))}
      </div>
    </div>,
    document.body,
  )
}
