import { IconArrowRight } from '@tabler/icons-react'

// A clickable surface card. The resting state follows the neutral ramp
// (border-gray-400 hairline, bg-background-200); hover lifts to border-gray-500
// + bg-gray-100, the same treatment as the combat-tracker rows. One sizing
// serves both list rows and grid cards — a flex row at p-3 with a gap-3 gutter
// — so place the leading content (portrait, etc.) first, your main content in
// a `min-w-0 flex-1` wrapper, and a trailing <SurfaceArrow>. `group` is baked
// in so the arrow can track the border on hover.

/**
 * Class string for a clickable surface — apply to a `<Link>`, `<a>`,
 * `<button>`, or `<div>`. Sizing and layout are baked in (one shared card
 * shape across list rows and grid cards); `extra` is for per-call additions
 * like a fixed width. Mirrors the `buttonClasses()` helper; pair with
 * `<SurfaceArrow>` for the trailing arrow.
 */
export function surfaceCardClasses(extra?: string): string {
  return `group flex items-center gap-3 rounded-xl border border-gray-400 bg-background-200 p-3 transition-colors duration-75 hover:border-gray-500 hover:bg-gray-100${extra ? ` ${extra}` : ''}`
}

/**
 * Trailing arrow for a surface card. Sits in the border tone (gray-400) and,
 * inside a `surfaceCardClasses()` group, shifts to gray-500 on hover to track
 * the border.
 */
export function SurfaceArrow({ className = '' }: { className?: string }) {
  return (
    <IconArrowRight
      size={16}
      aria-hidden
      className={`shrink-0 text-gray-400 transition-colors duration-75 group-hover:text-gray-500 ${className}`}
    />
  )
}
