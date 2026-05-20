interface DieShapeProps {
  className?: string
  bodyClassName?: string
  wireClassName?: string
}

// Hexagonal silhouette matching the wireframe path's outer extents.
const SILHOUETTE_POINTS =
  '12.93,0.07 24.68,7.86 25.31,21.57 12.66,27.07 0,21.52 0.92,7.42'

const WIREFRAME_PATH =
  'M25.31,21.57h0v0L24.68,7.86h0a.43.43,0,0,0,0,0s0-.06,0-.09l0,0v0l0,0,0-.05L24.5,7.5l0,0h0L12.93.07h0l-.05,0a.58.58,0,0,0-.18,0,.53.53,0,0,0-.18,0l-.06,0h0L.92,7.42a.5.5,0,0,0-.17.15l0,.06a.16.16,0,0,0,0,.07.54.54,0,0,0,0,.22L0,21.52s0,0,0,0H0s0,0,0,.06a.35.35,0,0,0,.06.17c0,.06.07.09.12.13a.1.1,0,0,0,0,0h0l0,0,12.11,6.26a.51.51,0,0,0,.27.09.49.49,0,0,0,.23-.06L25,22l0,0h0s0,0,0,0a.58.58,0,0,0,.13-.14.48.48,0,0,0,.05-.17S25.31,21.6,25.31,21.57Zm-1-.91L21,18.77l2.8-8.22ZM11.93,26.23,9.17,23.08,8.08,21.82,6,19.5H19.29l-6.63,7.57ZM8.36,12.05,5.05,17.79,1.81,8.26l9.87-1.95ZM5.8,18.49,12.66,6.61l6.86,11.88ZM23.52,8.26l-1.71,5-.36,1.06-1.17,3.45L17,12.05,13.65,6.31,22.13,8Zm-22,2.28,2.8,8.22L1.05,20.64ZM21.68,6.88l-1.62-.33L13.17,5.19V1.42ZM12.15,1.42V5.2l-2.67.52L6.8,6.25l-3.17.63ZM4.83,19.64l5.71,6.53-9-4.64Zm10,6.54,2.12-2.43,1.84-2.11,1.75-2,3.27,1.89Z'

/**
 * A d20-style die rendered as two SVG layers:
 * - silhouette polygon filled with `bodyClassName`'s color (the die body)
 * - wireframe path filled with `wireClassName`'s color (the visible 3D edges)
 *
 * Both colors are driven by `currentColor`, so callers use Tailwind text-*
 * utilities. If `bodyClassName` is omitted, only the wireframe is drawn.
 */
export function DieShape({
  className,
  bodyClassName,
  wireClassName,
}: DieShapeProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25.32 28.35"
      className={className}
      aria-hidden="true"
    >
      {bodyClassName && (
        <polygon
          points={SILHOUETTE_POINTS}
          fill="currentColor"
          className={bodyClassName}
        />
      )}
      <path fill="currentColor" className={wireClassName} d={WIREFRAME_PATH} />
    </svg>
  )
}
