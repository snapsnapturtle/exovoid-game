import type { ReactNode } from 'react'

export type DrawerSide = 'left' | 'right'
export type DrawerWidth = 'sm' | 'md' | 'lg'

const WIDTH: Record<DrawerWidth, string> = {
  sm: 'w-72',
  md: 'w-96',
  lg: 'w-[28rem]',
}

const SIDE: Record<
  DrawerSide,
  { position: string; border: string; closed: string }
> = {
  left: {
    position: 'left-0 top-0 h-full',
    border: 'border-r',
    closed: '-translate-x-full',
  },
  right: {
    position: 'right-0 top-0 h-full',
    border: 'border-l',
    closed: 'translate-x-full',
  },
}

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  side?: DrawerSide
  width?: DrawerWidth
  /** When true, render a darkening backdrop behind the drawer that closes on click. */
  backdrop?: boolean
  children: ReactNode
}

/**
 * Slide-over panel anchored to an edge of the viewport. `side="right"`
 * is the conventional edge drawer; `side="top"` drops a centered,
 * height-capped panel down from above (used for the play notes).
 *
 * Defaults to no backdrop so the underlying content stays interactive
 * while the drawer is open.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  width = 'md',
  backdrop = false,
  children,
}: DrawerProps) {
  const s = SIDE[side]
  return (
    <>
      {backdrop && (
        <div
          aria-hidden={!open}
          onClick={onClose}
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
      )}
      <aside
        aria-hidden={!open}
        className={`fixed ${s.position} z-40 flex ${WIDTH[width]} flex-col ${s.border} border-gray-400 bg-background-200 transition-transform duration-200 ${
          open ? 'translate-x-0' : `pointer-events-none ${s.closed}`
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-400 px-4 py-3">
          <div className="min-w-0 text-sm font-semibold text-white">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-900 transition hover:bg-gray-100 hover:text-white"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  )
}
