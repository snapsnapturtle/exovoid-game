import { useState, type ReactNode } from 'react'
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react'

interface EffectTooltipProps {
  text: string
  children: ReactNode
}

/**
 * Hover/focus tooltip surfacing an arbitrary effect string — the same
 * floating-ui plumbing the inventory uses for manufacturer and mod chips.
 * Shared so the read-only equipped-gear cards on the combat sheet can
 * reuse the exact same chip + tooltip treatment.
 */
export function EffectTooltip({ text, children }: EffectTooltipProps) {
  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const hover = useHover(context, {
    delay: { open: 100, close: 0 },
    move: false,
  })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ])
  return (
    <>
      <span ref={refs.setReference} tabIndex={0} {...getReferenceProps()}>
        {children}
      </span>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="elevation-float z-50 w-72 rounded-lg border border-gray-400 bg-background-200 px-3 py-2 text-xs text-gray-1000 whitespace-pre-line"
            {...getFloatingProps()}
          >
            {text}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
