import type { DerivedStats } from '~/lib/game-logic/derived-stats'

interface DerivedStatsPanelProps {
  stats: DerivedStats
}

const STAT_DISPLAY = [
  { key: 'health', label: 'Health' },
  { key: 'vigilance', label: 'Vigilance' },
  { key: 'heft', label: 'Heft' },
  { key: 'edge', label: 'Edge' },
  { key: 'actionPoints', label: 'Action Points' },
  { key: 'speed', label: 'Speed' },
  { key: 'cyberImmunity', label: 'Cyber Immunity' },
] as const

export function DerivedStatsPanel({ stats }: DerivedStatsPanelProps) {
  return (
    <div className="rounded-xl border border-void-600 bg-void-800 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Derived Stats
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {STAT_DISPLAY.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-void-600 bg-void-700 px-3 py-2"
          >
            <span className="text-xs text-gray-400">{label}</span>
            <span className="text-lg font-bold text-white">{stats[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
