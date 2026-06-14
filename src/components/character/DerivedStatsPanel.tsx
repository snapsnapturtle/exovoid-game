import { useState } from 'react'
import type { DerivedStats } from '~/lib/game-logic/derived-stats'
import type {
  Contribution,
  DerivedStatId,
} from '~/lib/game-logic/passive-effects'
import type { DicePool } from '~/lib/game-logic/dice'
import { Button } from '~/components/ui/Button'
import { Textarea } from '~/components/ui/Input'
import { DiceRoller } from '~/components/dice/DiceRoller'

interface DerivedStatsPanelProps {
  stats: DerivedStats
  contributions?: Partial<Record<DerivedStatId, Contribution[]>>
  gameId: string
  characterId: string
  notes: string
  onNotesChange: (value: string) => void
  /** Whether the notes tab is editable. Notes are editable outside of edit
   * mode by design (mirrors the play-notes scratchpad), so callers pass the
   * sheet-wide `canEdit` rather than the edit-scope flag. */
  canEditNotes: boolean
}

type Tab = 'derived' | 'notes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'derived', label: 'Derived stats' },
  { id: 'notes', label: 'Notes' },
]

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
  notes,
  onNotesChange,
  canEditNotes,
}: DerivedStatsPanelProps) {
  const [rolling, setRolling] = useState<{
    name: string
    pool: DicePool
  } | null>(null)
  const [tab, setTab] = useState<Tab>('derived')

  const vigilancePool: DicePool = {
    standard: 1,
    aptitude: stats.vigilance,
    expertise: 0,
    total: 1 + stats.vigilance,
  }

  return (
    <>
      <div className="rounded-xl border border-gray-400 bg-background-200">
        <div className="flex flex-wrap gap-1 border-b border-gray-400 p-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-accent-700/20 text-accent-900'
                  : 'text-gray-900 hover:bg-gray-100 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex min-h-[14rem] flex-col p-3">
          {tab === 'derived' && (
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
                      {key === 'vigilance' && (
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() =>
                            setRolling({
                              name: 'Vigilance',
                              pool: vigilancePool,
                            })
                          }
                          title="Roll Vigilance"
                        >
                          Roll
                        </Button>
                      )}
                      <span className="text-lg font-bold text-white">
                        {total}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {tab === 'notes' &&
            (canEditNotes ? (
              <Textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Quick notes during play…"
                className="w-full flex-1 resize-none"
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-gray-1000">
                {notes || <span className="text-gray-700">No notes yet.</span>}
              </p>
            ))}
        </div>
      </div>
      {rolling && (
        <DiceRoller
          gameId={gameId}
          characterId={characterId}
          skillName={rolling.name}
          pool={rolling.pool}
          onClose={() => setRolling(null)}
        />
      )}
    </>
  )
}
