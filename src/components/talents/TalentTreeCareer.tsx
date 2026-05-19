import { TalentNode, type NodeState } from './TalentNode'
import type { TalentEntry } from '~/lib/types/database'
import type { CareerData } from '~/lib/game-logic/talents'
import {
  tierPrereqMet,
  unlockedInCareer,
} from '~/lib/game-logic/talents'

interface TalentTreeCareerProps {
  career: CareerData
  talents: TalentEntry[]
  pointsAvailable: number
  selectedName: string | null
  descriptionByName: Map<string, string>
  onSelect: (talentName: string, careerName: string, tier: number) => void
}

export function TalentTreeCareer({
  career,
  talents,
  pointsAvailable,
  selectedName,
  descriptionByName,
  onSelect,
}: TalentTreeCareerProps) {
  const ownedNames = new Set(talents.map((t) => t.name))
  const unlockedHere = unlockedInCareer(talents, career.name)
  const unlockedCount = unlockedHere.length

  const byTier = new Map<number, typeof career.talents>()
  for (const t of career.talents) {
    const arr = byTier.get(t.tier) ?? []
    arr.push(t)
    byTier.set(t.tier, arr)
  }
  const tiers = [...byTier.keys()].sort((a, b) => a - b)

  return (
    <section className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-white">{career.name}</h3>
        <span className="text-xs text-gray-700">
          {unlockedCount} unlocked in this career
        </span>
      </header>

      <div className="space-y-3">
        {tiers.map((tier) => (
          <div key={tier} className="flex items-start gap-3">
            <div className="w-14 shrink-0 pt-2 text-xs uppercase tracking-wide text-gray-700">
              Tier {tier}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              {byTier.get(tier)!.map((ref) => {
                const owned = ownedNames.has(ref.talent)
                const prereqMet = tierPrereqMet(unlockedCount, ref.tier)
                const state: NodeState = owned
                  ? 'owned'
                  : !prereqMet
                    ? 'locked-prereq'
                    : pointsAvailable <= 0
                      ? 'locked-no-points'
                      : 'available'
                const reason =
                  state === 'locked-prereq'
                    ? `Need ${ref.tier} talents in this career first (have ${unlockedCount}).`
                    : state === 'locked-no-points'
                      ? 'No talent points available.'
                      : undefined
                return (
                  <TalentNode
                    key={ref.talent}
                    name={ref.talent}
                    description={descriptionByName.get(ref.talent) ?? ''}
                    state={state}
                    selected={selectedName === ref.talent}
                    reason={reason}
                    onClick={() => onSelect(ref.talent, career.name, ref.tier)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
