import type { DieType, DieSymbol } from '~/lib/game-logic/dice'

const DIE_BG: Record<DieType, string> = {
  standard: '/img/dice/standard.png',
  aptitude: '/img/dice/aptitude.png',
  expertise: '/img/dice/expertise.png',
  injury: '/img/dice/injury.png',
}

interface DieProps {
  type: DieType
  symbols: DieSymbol[]
  exploded?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_PX: Record<NonNullable<DieProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
}

const SYMBOL_PX: Record<NonNullable<DieProps['size']>, number> = {
  sm: 18,
  md: 24,
  lg: 32,
}

/** A single rolled die: background image with the rolled symbol(s) overlaid. */
export function Die({ type, symbols, exploded, size = 'md' }: DieProps) {
  const px = SIZE_PX[size]
  const symPx = SYMBOL_PX[size]
  const symbolsForOverlay = symbols.filter((s) => s !== 'explosive')
  const overlay = symbolsForOverlay.length
    ? symbolsForOverlay.join('_')
    : null

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded ${exploded ? 'ring-2 ring-warning-400/70' : ''}`}
      style={{
        width: px,
        height: px,
        backgroundImage: `url("${DIE_BG[type]}")`,
        backgroundSize: 'cover',
      }}
      title={`${type}${exploded ? ' (explosive re-roll)' : ''}`}
    >
      {overlay && (
        <img
          src={`/img/symbols/${overlay}.png`}
          alt={overlay}
          width={symPx}
          height={symPx}
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
      className="relative inline-flex items-center justify-center rounded font-semibold text-white drop-shadow"
      style={{
        width: px,
        height: px,
        backgroundImage: `url("${DIE_BG[type]}")`,
        backgroundSize: 'cover',
      }}
      title={type}
    >
      {count}
    </div>
  )
}
