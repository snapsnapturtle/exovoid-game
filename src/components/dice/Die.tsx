import type { DieType, DieSymbol, PolyDieType } from '~/lib/game-logic/dice'
import { DieShape } from './DieShape'

// The die body fills the silhouette in the type's primary color; the
// wireframe edges sit on top in a lighter shade for the highlight that
// gives the 3D effect. blue / success / danger satisfy "wire lighter
// than body" with the 700 / 900 ramp positions; warning's ramp is
// non-monotonic — 600 dips back to a deeper amber while 700 is the
// brightest shade — so the expertise die uses 600 body / 700 wire to
// preserve the same darker-body / brighter-wire relationship.
const DIE_BODY: Record<DieType, string> = {
  standard: 'text-blue-700',
  aptitude: 'text-success-700',
  expertise: 'text-warning-600',
  injury: 'text-danger-700',
}

const DIE_WIRE: Record<DieType, string> = {
  standard: 'text-blue-900',
  aptitude: 'text-success-900',
  expertise: 'text-warning-700',
  injury: 'text-danger-900',
}

interface DieProps {
  type: DieType
  symbols: DieSymbol[]
  exploded?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_PX: Record<NonNullable<DieProps['size']>, number> = {
  sm: 40,
  md: 60,
  lg: 80,
}

const SYMBOL_PX: Record<NonNullable<DieProps['size']>, number> = {
  sm: 18,
  md: 22,
  lg: 30,
}

const COUNT_TEXT: Record<NonNullable<DieProps['size']>, string> = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
}

/** A single rolled die: filled die silhouette with the rolled symbol(s) on top. */
export function Die({ type, symbols, exploded, size = 'md' }: DieProps) {
  const px = SIZE_PX[size]
  const symPx = SYMBOL_PX[size]
  // Keep `explosive` in the join so `success+explosive` resolves to the
  // combined `success_explosive.png` image. Same for `success_trigger`.
  const overlay = symbols.length ? symbols.join('_') : null

  return (
    <div
      className={`relative inline-flex items-center justify-center ${exploded ? 'rounded ring-2 ring-warning-900/70' : ''}`}
      style={{ width: px, height: px }}
      title={`${type}${exploded ? ' (explosive re-roll)' : ''}`}
    >
      <DieShape
        className="absolute inset-0 h-full w-full"
        bodyClassName={DIE_BODY[type]}
        wireClassName={DIE_WIRE[type]}
      />
      {overlay && (
        <img
          src={`/img/symbols/${overlay}.png`}
          alt={overlay}
          width={symPx}
          height={symPx}
          className="symbol-outline relative z-10"
        />
      )}
    </div>
  )
}

interface DieCounterProps {
  type: DieType
  count: number
  size?: 'sm' | 'md' | 'lg'
}

/** Compact die badge with a count overlay — used in pools/summaries. */
export function DieCounter({ type, count, size = 'sm' }: DieCounterProps) {
  const px = SIZE_PX[size]
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: px, height: px }}
      title={type}
    >
      <DieShape
        className="absolute inset-0 h-full w-full"
        bodyClassName={DIE_BODY[type]}
        wireClassName={DIE_WIRE[type]}
      />
      <span
        className={`die-number relative z-10 font-semibold text-white ${COUNT_TEXT[size]}`}
      >
        {count}
      </span>
    </div>
  )
}

interface PolyDieProps {
  type: PolyDieType
  value: number
  size?: 'sm' | 'md' | 'lg'
}

/**
 * A single rolled polyhedral die (d4–d100): die silhouette with the rolled
 * number on top. Uses the purple ramp so numeric dice read as distinct from
 * the Exovoid symbol dice (and from the accent/teal used for selection).
 */
export function PolyDie({ type, value, size = 'md' }: PolyDieProps) {
  const px = SIZE_PX[size]
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: px, height: px }}
      title={type}
    >
      <DieShape
        className="absolute inset-0 h-full w-full"
        bodyClassName="text-purple-700"
        wireClassName="text-purple-900"
      />
      <span
        className={`die-number relative z-10 font-semibold tabular-nums text-white ${COUNT_TEXT[size]}`}
      >
        {value}
      </span>
    </div>
  )
}
