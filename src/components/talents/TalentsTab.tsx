import { Link } from '@tanstack/react-router'
import type { TalentEntry } from '~/lib/types/database'
import talentsData from '~/data/talents.json'
import { pointsTotal, pointsSpent } from '~/lib/game-logic/talents'

interface TalentMeta {
  name: string
  description: string
}
const ALL_TALENTS = talentsData as TalentMeta[]
const DESCRIPTION_BY_NAME = new Map(ALL_TALENTS.map((t) => [t.name, t.description]))

interface TalentsTabProps {
  talents: TalentEntry[]
  level: number
  career: string
  gameId: string
  characterId: string
  canEdit: boolean
}

export function TalentsTab({
  talents,
  level,
  career,
  gameId,
  characterId,
  canEdit,
}: TalentsTabProps) {
  const total = pointsTotal(level)
  const spent = pointsSpent(talents)
  const available = total - spent

  const regular = talents.filter((t) => !t.granted)
  const granted = talents.filter((t) => t.granted)
  const grouped = groupByTier(regular)
  const tiers = [...grouped.keys()].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-300">
          <span className="font-medium text-white">{spent}</span>
          <span className="text-gray-500"> / </span>
          <span className="text-gray-400">{total}</span>
          <span className="ml-2 text-xs text-gray-500">
            ({available} available)
          </span>
        </div>
        {canEdit && (
          <Link
            to="/games/$gameId/characters/$characterId/talents"
            params={{ gameId, characterId }}
            className="rounded-lg border border-accent-500 bg-accent-500/10 px-3 py-1.5 text-sm text-accent-300 transition hover:bg-accent-500/20"
          >
            Manage talents →
          </Link>
        )}
      </div>

      {talents.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No talents unlocked yet.
          {career ? ` Pick from the ${career} tree to grow your character.` : ''}
        </p>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div key={tier}>
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Tier {tier}
              </div>
              <ul className="space-y-1">
                {grouped.get(tier)!.map((t) => (
                  <li
                    key={t.name}
                    className="rounded border border-void-600 bg-void-700/40 p-2 text-sm"
                  >
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {DESCRIPTION_BY_NAME.get(t.name) ?? '—'}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {granted.length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-cyber-400">
                Granted
              </div>
              <ul className="space-y-1">
                {granted.map((t) => (
                  <li
                    key={t.name}
                    className="rounded border border-cyber-500/40 bg-void-700/40 p-2 text-sm"
                  >
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {DESCRIPTION_BY_NAME.get(t.name) ?? '—'}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function groupByTier(talents: TalentEntry[]): Map<number, TalentEntry[]> {
  const map = new Map<number, TalentEntry[]>()
  for (const t of talents) {
    const arr = map.get(t.tier) ?? []
    arr.push(t)
    map.set(t.tier, arr)
  }
  return map
}
