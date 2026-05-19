import { useState } from 'react'
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
import { parseQuality } from '~/lib/game-logic/weapons'
import { lookupQuality } from '~/lib/game-logic/item-qualities'

interface QualityBadgeProps {
  /** Raw quality string from the catalog, e.g. "Concealed (1)" or "Penetrating". */
  raw: string
  variant?: 'quality' | 'trigger'
}

/**
 * A compact badge for an item quality or trigger option. Hover (or keyboard
 * focus) shows the rulebook effect description in a portaled tooltip that
 * auto-flips and shifts to stay on screen and isn't clipped by modal
 * overflow. Unknown names render as a plain badge with no tooltip.
 */
export function QualityBadge({ raw, variant = 'quality' }: QualityBadgeProps) {
  const { name, level } = parseQuality(raw)
  const quality = lookupQuality(name)
  const display = level !== null ? `${name} (${level})` : name
  const tone =
    variant === 'trigger'
      ? 'border-accent-700/40 bg-accent-700/10 text-accent-900'
      : 'border-gray-500 bg-gray-100 text-gray-1000'

  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const hover = useHover(context, {
    enabled: !!quality,
    delay: { open: 100, close: 0 },
    move: false,
  })
  const focus = useFocus(context, { enabled: !!quality })
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
      <span
        ref={refs.setReference}
        tabIndex={quality ? 0 : undefined}
        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-accent-900 ${
          quality ? 'cursor-help' : ''
        } ${tone}`}
        {...getReferenceProps()}
      >
        {display}
      </span>
      {quality && open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50 w-64 rounded-lg border border-gray-400 bg-background-100 px-3 py-2 text-xs text-gray-1000 shadow-xl"
            {...getFloatingProps()}
          >
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
              {quality.type} · {quality.name}
            </div>
            <div className="whitespace-pre-line">{quality.effect}</div>
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
