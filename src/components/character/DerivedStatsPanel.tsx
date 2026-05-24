import { useState } from 'react'
import type { DerivedStats } from '~/lib/game-logic/derived-stats'
import type {
  Contribution,
  DerivedStatId,
} from '~/lib/game-logic/passive-effects'
import type { DicePool } from '~/lib/game-logic/dice'
import { Button } from '~/components/ui/Button'
import { DiceRoller } from '~/components/dice/DiceRoller'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'
import type { PendingBonus } from '~/lib/types/database'

interface DerivedStatsPanelProps {
  stats: DerivedStats
  contributions?: Partial<Record<DerivedStatId, Contribution[]>>
  gameId: string
  characterId: string
  /** Pass `undefined` for NPCs to hide the spend-Edge affordance entirely. */
  edgeAvailable: number | undefined
  onSpendEdge: () => void
  pendingBonuses: PendingBonus[]
  onApplyBonus: (bonus: ApplyBonusInput) => string
  onConsumeBonuses: (ids: string[]) => void
  onRemoveBonus: (id: string) => void
  /** Initial state for the roll modal's "Hidden roll" checkbox. True for
   * hidden NPCs so the GM doesn't have to remember to tick it. */
  defaultHidden?: boolean
}

const STAT_DISPLAY: { key: DerivedStatId; label: string }[] = [
  { key: 'health', label: 'Health' },
  { key: 'vigilance', label: 'Vigilance' },
  { key: 'heft', label: 'Heft' },
  { key: 'edge', label: 'Edge' },
  { key: 'actionPoints', label: 'Action Points' },
  { key: 'speed', label: 'Speed' },
  { key: 'cyberImmunity', label: 'Cyber Immunity' },
  { key: 'soak', label: 'Soak' },
]

export function DerivedStatsPanel({
  stats,
  contributions,
  gameId,
  characterId,
  edgeAvailable,
  onSpendEdge,
  pendingBonuses,
  onApplyBonus,
  onConsumeBonuses,
  onRemoveBonus,
  defaultHidden,
}: DerivedStatsPanelProps) {
  const [rolling, setRolling] = useState<{
    name: string
    pool: DicePool
  } | null>(null)

  const vigilancePool: DicePool = {
    standard: 1,
    aptitude: stats.vigilance,
    expertise: 0,
    total: 1 + stats.vigilance,
  }

  return (
    <>
      <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-900">
          Derived Stats
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {STAT_DISPLAY.map(({ key, label }) => {
            const bonuses = contributions?.[key] ?? []
            const total = stats[key]
            const sumBonus = bonuses.reduce((acc, b) => acc + b.value, 0)
            const base = total - sumBonus
            const tooltip =
              bonuses.length > 0
                ? `${label}: base ${base}${bonuses.map((b) => ` ${b.value >= 0 ? '+' : ''}${b.value} ${b.source}`).join('')} = ${total}`
                : label
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-gray-400 bg-gray-100 px-3 py-2"
                title={tooltip}
              >
                <span className="text-xs text-gray-900">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{total}</span>
                  {key === 'vigilance' && (
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() =>
                        setRolling({ name: 'Vigilance', pool: vigilancePool })
                      }
                      title="Roll Vigilance"
                    >
                      Roll
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {rolling && (
        <DiceRoller
          gameId={gameId}
          characterId={characterId}
          skillName={rolling.name}
          pool={rolling.pool}
          edgeAvailable={edgeAvailable}
          onSpendEdge={onSpendEdge}
          pendingBonuses={pendingBonuses}
          onApplyBonus={onApplyBonus}
          onConsumeBonuses={onConsumeBonuses}
          onRemoveBonus={onRemoveBonus}
          defaultHidden={defaultHidden}
          onClose={() => setRolling(null)}
        />
      )}
    </>
  )
}
