import { useState, type ReactNode } from 'react'
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStatus,
  type Placement,
} from '@floating-ui/react'

interface UsePopoverOptions {
  /**
   * Preferred placement relative to the trigger; `flip` swaps it if there's
   * not enough room. Defaults to `bottom-start` — the popover drops down
   * from the trigger, left-aligned.
   */
  placement?: Placement
  /** Distance between trigger and popover, in px. */
  offsetPx?: number
  /**
   * Minimum height (px) the popover will be capped to, even when there's
   * less viewport room than that. Below this the popover would be
   * unusable; floating-ui's `flip` should usually find a better placement
   * before that.
   */
  minHeight?: number
}

/**
 * Hook + companion `<Popover>` component for a click-to-toggle popover
 * anchored to an arbitrary trigger. Wraps the floating-ui middleware stack
 * we want everywhere (offset, flip, shift, size-cap to viewport), the
 * standard click+dismiss+role interactions, and the open/close transition.
 *
 * Usage:
 *   const popover = usePopover()
 *   return (
 *     <>
 *       <button ref={popover.refs.setReference} {...popover.getReferenceProps()}>
 *         Open
 *       </button>
 *       <Popover popover={popover} className="w-80 p-3">
 *         …content…
 *       </Popover>
 *     </>
 *   )
 *
 * `popover.open` is a plain boolean — use it to toggle a chevron rotation
 * or any other trigger-side state.
 */
export function usePopover({
  placement = 'bottom-start',
  offsetPx = 6,
  minHeight = 160,
}: UsePopoverOptions = {}) {
  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [
      offset(offsetPx),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      // Cap the popover at the actual room between trigger and viewport
      // edge so the inner content scrolls when it doesn't fit. Setting a
      // CSS custom property (rather than `max-height` directly) lets the
      // inner animated card consume the cap via `max-height: var(...)` —
      // we can't put `max-height` on the outer because its transform is
      // owned by floating-ui's positioning each frame.
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.setProperty(
            '--popover-max-height',
            `${Math.max(minHeight, availableHeight)}px`,
          )
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'dialog' })
  const interactions = useInteractions([click, dismiss, role])
  const transition = useTransitionStatus(context, { duration: 120 })

  return {
    open,
    setOpen,
    refs,
    floatingStyles,
    getReferenceProps: interactions.getReferenceProps,
    getFloatingProps: interactions.getFloatingProps,
    transition,
  }
}

export type UsePopoverReturn = ReturnType<typeof usePopover>

interface PopoverProps {
  popover: UsePopoverReturn
  /** Extra classes for the inner card — typically a width + layout shape. */
  className?: string
  children: ReactNode
}

/**
 * Renders the floating popover body when `popover.transition.isMounted` is
 * true. Adds the project's elevation, 1px border, and the fade-and-drop
 * open/close transition. The caller controls everything inside.
 */
export function Popover({ popover, className = '', children }: PopoverProps) {
  if (!popover.transition.isMounted) return null
  const status = popover.transition.status
  const visible = status === 'open'
  return (
    <FloatingPortal>
      <div
        ref={popover.refs.setFloating}
        style={popover.floatingStyles}
        {...popover.getFloatingProps()}
        className="z-50"
      >
        <div
          className={`popover-card ${visible ? 'popover-card-open' : 'popover-card-closed'} elevation-float flex flex-col overflow-hidden rounded-lg border border-gray-400 bg-background-200 ${className}`}
        >
          {children}
        </div>
      </div>
    </FloatingPortal>
  )
}
