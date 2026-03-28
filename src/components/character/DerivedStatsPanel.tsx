import type { DerivedStats } from '~/lib/game-logic/derived-stats'

interface DerivedStatsPanelProps {
  stats: DerivedStats
  healthCurrent: number | null
  edgeCurrent: number
  canEdit: boolean
  onHealthChange: (value: number | null) => void
  onEdgeChange: (value: number) => void
}

const STAT_DISPLAY = [
  { key: 'health', label: 'Health', hasTracker: true },
  { key: 'vigilance', label: 'Vigilance', hasTracker: false },
  { key: 'heft', label: 'Heft', hasTracker: false },
  { key: 'edge', label: 'Edge', hasTracker: true },
  { key: 'actionPoints', label: 'Action Points', hasTracker: false },
  { key: 'speed', label: 'Speed', hasTracker: false },
  { key: 'cyberImmunity', label: 'Cyber Immunity', hasTracker: false },
] as const

export function DerivedStatsPanel({
  stats,
  healthCurrent,
  edgeCurrent,
  canEdit,
  onHealthChange,
  onEdgeChange,
}: DerivedStatsPanelProps) {
  const currentHealth = healthCurrent ?? stats.health

  return (
    <div className="rounded-xl border border-void-600 bg-void-800 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Derived Stats</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {STAT_DISPLAY.map(({ key, label, hasTracker }) => {
          const maxValue = stats[key]
          const isHealth = key === 'health'
          const isEdge = key === 'edge'
          const currentValue = isHealth
            ? currentHealth
            : isEdge
              ? edgeCurrent
              : maxValue

          return (
            <div
              key={key}
              className="rounded-lg border border-void-600 bg-void-700 p-3"
            >
              <span className="text-xs text-gray-400">{label}</span>
              <div className="mt-1 flex items-baseline gap-1">
                {hasTracker && canEdit ? (
                  <>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const next = currentValue - 1
                          if (isHealth)
                            onHealthChange(next <= 0 ? 0 : next)
                          else onEdgeChange(Math.max(0, next))
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded bg-void-600 text-xs text-gray-300 hover:bg-void-500"
                      >
                        -
                      </button>
                      <span className="min-w-[2ch] text-center text-xl font-bold text-white">
                        {currentValue}
                      </span>
                      <button
                        onClick={() => {
                          const next = currentValue + 1
                          if (isHealth)
                            onHealthChange(
                              next >= maxValue ? null : next,
                            )
                          else onEdgeChange(Math.min(maxValue, next))
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded bg-void-600 text-xs text-gray-300 hover:bg-void-500"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">/ {maxValue}</span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-white">
                    {maxValue}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
