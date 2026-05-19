import type { DerivedStats } from '~/lib/game-logic/derived-stats'
import type { Contribution, DerivedStatId } from '~/lib/game-logic/passive-effects'

interface DerivedStatsPanelProps {
  stats: DerivedStats
  contributions?: Partial<Record<DerivedStatId, Contribution[]>>
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
}: DerivedStatsPanelProps) {
  return (
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
              <span className="text-lg font-bold text-white">{total}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
