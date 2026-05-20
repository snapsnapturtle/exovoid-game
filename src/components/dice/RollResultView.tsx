import { Die } from './Die'
import type { DieType } from '~/lib/game-logic/dice'
import type { DiceRollData } from '~/lib/server/dice'

const SYMBOL_ORDER = [
  'botch',
  'success',
  'complication',
  'trigger',
  'xp',
  'wound',
  'minion',
  'cyberware',
  'adrenaline',
] as const

function orderSymbols(summary: Record<string, number>): string[] {
  return Object.keys(summary).sort((a, b) => {
    const ia = SYMBOL_ORDER.indexOf(a as (typeof SYMBOL_ORDER)[number])
    const ib = SYMBOL_ORDER.indexOf(b as (typeof SYMBOL_ORDER)[number])
    return (
      (ia === -1 ? SYMBOL_ORDER.length : ia) -
      (ib === -1 ? SYMBOL_ORDER.length : ib)
    )
  })
}

const TYPE_ORDER: DieType[] = ['standard', 'aptitude', 'expertise', 'injury']

// Tunes how quickly result dice cascade in. Total animation ≈ stagger * dice + 420ms.
const CASCADE_STAGGER_MS = 60

interface RollResultViewProps {
  data: DiceRollData
  dieSize?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

export function RollResultView({
  data,
  dieSize = 'md',
  animate = true,
}: RollResultViewProps) {
  const summary = data.summary ?? {}
  const ordered = orderSymbols(summary)
  const dice = [...(data.result ?? [])].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type),
  )

  return (
    <div>
      <div className="mb-5">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
          Result
        </p>
        {ordered.length === 0 ? (
          <p className="text-sm text-gray-700">No symbols</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {ordered.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-sm text-gray-1000"
              >
                <img
                  src={`/img/symbols/${s}.png`}
                  alt={s}
                  width={20}
                  height={20}
                />
                <span className="capitalize">{s}</span>
                <span className="text-gray-900">×{summary[s]}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      {dice.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
            Rolled Dice
          </p>
          <div className="flex flex-wrap gap-2">
            {dice.map((d, i) => (
              <div
                key={i}
                className={animate ? 'die-tumble-in' : undefined}
                style={
                  animate
                    ? { animationDelay: `${i * CASCADE_STAGGER_MS}ms` }
                    : undefined
                }
              >
                <Die
                  type={d.type}
                  symbols={d.symbols}
                  exploded={d.exploded}
                  size={dieSize}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
