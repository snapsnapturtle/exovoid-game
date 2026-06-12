import type { TalentEntry } from '~/lib/types/domain'
import {
  tierPrereqMet,
  unlockedInCareer,
  type CareerData,
} from '~/lib/game-logic/talents'
import { TalentTreeNode, type TalentNodeState } from './TalentTreeNode'

interface Props {
  career: CareerData
  /** All talents currently on the character (used for owned + tier-prereq
   * counts). Pass the *base* talent set during history edits so the row
   * being edited doesn't double-count itself. */
  talents: TalentEntry[]
  /** Currently picked talent in the wizard draft. Used to draw the
   * selection ring. */
  selectedTalent: { name: string; career: string } | null
  descriptionByName: Map<string, string>
  onSelect: (talentName: string, careerName: string, tier: number) => void
}

/**
 * One career's talent tree, grouped per tier in a horizontal row layout.
 * The tier label sits on the left, available + owned + locked talents
 * wrap to the right. Mirrors the previous `/talents` page chrome — the
 * level-up wizard reuses it as the talent picker.
 */
export function TalentTreeCareer({
  career,
  talents,
  selectedTalent,
  descriptionByName,
  onSelect,
}: Props) {
  const ownedNames = new Set(talents.map((t) => t.name))
  const unlockedCount = unlockedInCareer(talents, career.name).length

  const byTier = new Map<number, typeof career.talents>()
  for (const t of career.talents) {
    const arr = byTier.get(t.tier) ?? []
    arr.push(t)
    byTier.set(t.tier, arr)
  }
  const tiers = [...byTier.keys()].sort((a, b) => a - b)

  return (
    <section className="rounded-xl border border-gray-400 bg-background-100 p-3">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-white">{career.name}</h3>
        <span className="text-xs text-gray-700">{unlockedCount} unlocked</span>
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
                const state: TalentNodeState = owned
                  ? 'owned'
                  : !prereqMet
                    ? 'locked-prereq'
                    : 'available'
                const reason =
                  state === 'locked-prereq'
                    ? `Need ${ref.tier} talents in this career first (have ${unlockedCount}).`
                    : state === 'owned'
                      ? 'Already unlocked.'
                      : undefined
                const selected =
                  !!selectedTalent &&
                  selectedTalent.name === ref.talent &&
                  selectedTalent.career === career.name
                return (
                  <TalentTreeNode
                    key={ref.talent}
                    name={ref.talent}
                    description={descriptionByName.get(ref.talent) ?? ''}
                    state={state}
                    selected={selected}
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
