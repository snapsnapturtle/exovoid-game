import type { CSSProperties } from 'react'

interface DotMatrixProps {
  /** Dots per side — the grid is always square (grid × grid). Default 3. */
  grid?: number
  /** Diameter of each dot, in px. Default 3. */
  dotSize?: number
  /** Gap between dots, in px. Default 2. */
  gap?: number
  /** Length of one full ripple cycle, in ms. Default 1100. */
  duration?: number
  /**
   * Whether the ripple animates. When false the dots sit static at their
   * resting opacity — used when the loader is mounted but hidden (e.g. faded
   * out) so its CSS animation isn't burning frames off-screen.
   */
  active?: boolean
  /**
   * Accessible label (e.g. "Loading"). When set the grid is announced as a
   * `role="status"` live region with sr-only text; omit for a purely
   * decorative instance, which is then hidden from assistive tech.
   */
  label?: string
  /**
   * Extra classes on the grid container. Colour comes from `currentColor`
   * (the dots paint with `bg-current`), so set a `text-*` class here — or on
   * any ancestor — to recolour. With none, dots inherit the surrounding text
   * colour.
   */
  className?: string
}

/**
 * A compact dot-matrix loader: a square grid of dots that ripple diagonally —
 * a bright wave sweeping from the top-left corner to the bottom-right. Each
 * dot's animation-delay is staggered by its row+col diagonal so a single wave
 * travels across (almost) the whole cycle. Colour follows `currentColor`.
 * Animation + reduced-motion handling live in the `.dot-matrix-*` rules in
 * app.css.
 */
export function DotMatrix({
  grid = 3,
  dotSize = 3,
  gap = 2,
  duration = 1100,
  active = true,
  label,
  className = '',
}: DotMatrixProps) {
  const maxDiagonal = 2 * (grid - 1)
  // Spread the per-dot delays across the whole cycle so the wave travels
  // continuously rather than flashing the grid all at once and pausing.
  const step = duration / (maxDiagonal + 1)

  const dots: Array<{ key: string; delay: number }> = []
  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      dots.push({ key: `${row}-${col}`, delay: (row + col) * step })
    }
  }

  return (
    <span
      {...(label
        ? { role: 'status', 'aria-label': label }
        : { 'aria-hidden': true })}
      className={`dot-matrix inline-grid align-middle ${active ? 'dot-matrix--active' : ''} ${className}`}
      style={
        {
          gridTemplateColumns: `repeat(${grid}, ${dotSize}px)`,
          gap: `${gap}px`,
          '--dmx-duration': `${duration}ms`,
        } as CSSProperties
      }
    >
      {dots.map((dot) => (
        <span
          key={dot.key}
          className="dot-matrix-dot rounded-full bg-current"
          style={{
            width: dotSize,
            height: dotSize,
            animationDelay: `${dot.delay}ms`,
          }}
        />
      ))}
    </span>
  )
}
