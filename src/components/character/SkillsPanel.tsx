import { useState } from 'react'
import type {
  CharacterAttributes,
  PendingBonus,
  PendingSupport,
} from '~/lib/types/database'
import { SKILLS, MAX_SKILL_LEVEL } from '~/lib/game-logic/skills'
import {
  computeAttributeAverage,
  computeDicePool,
  computeSupportPool,
  type DicePool,
} from '~/lib/game-logic/dice'
import { DiceRoller } from '~/components/dice/DiceRoller'
import { InlineStepper } from '~/components/ui/InlineStepper'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'

interface SkillsPanelProps {
  attributes: CharacterAttributes
  skills: Record<string, number>
  canEdit: boolean
  onSkillChange: (skillId: string, value: number) => void
  favoriteSkills: string[]
  /** Owner-toggled star. True whenever the viewer has stat-edit rights
   * regardless of the sheet's play/edit mode — star toggles work outside
   * of edit mode by design. */
  canFavorite: boolean
  onToggleFavorite: (skillId: string) => void
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
  /** Pre-rolled support contributions available in this game (any skill). The
   * panel filters by current skill id at the per-row level when opening the
   * Roll modal. */
  availableSupport?: PendingSupport[]
  /** Display label used to populate PendingSupport.supporterName when this
   * character rolls support — defaults to the character's name. */
  characterName: string
}

export function SkillsPanel({
  attributes,
  skills,
  canEdit,
  onSkillChange,
  favoriteSkills,
  canFavorite,
  onToggleFavorite,
  gameId,
  characterId,
  edgeAvailable,
  onSpendEdge,
  pendingBonuses,
  onApplyBonus,
  onConsumeBonuses,
  onRemoveBonus,
  defaultHidden,
  availableSupport,
  characterName,
}: SkillsPanelProps) {
  const [filter, setFilter] = useState('')
  const [rolling, setRolling] = useState<{
    mode: 'normal' | 'support'
    skillId: string
    skillName: string
    pool: DicePool
  } | null>(null)

  const filtered = filter
    ? SKILLS.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
    : SKILLS

  const favoriteSet = new Set(favoriteSkills)
  const sorted = [...filtered].sort((a, b) => {
    const aFav = favoriteSet.has(a.id) ? 0 : 1
    const bFav = favoriteSet.has(b.id) ? 0 : 1
    if (aFav !== bFav) return aFav - bFav
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">Skills</h3>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter skills..."
          className="w-48 rounded-lg border border-gray-400 bg-gray-100 px-3 py-1.5 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 text-xs text-gray-700">
          <span>Skill</span>
          <span className="w-16 text-center">Level</span>
          <span className="w-[90px] pl-2 text-left">Roll</span>
          <span className="w-[64px] pl-1 text-left">Support</span>
        </div>
        {sorted.map((skill) => {
          const level = skills[skill.id] ?? 0
          const attrAvg = computeAttributeAverage(attributes, skill.attributes)
          const pool = computeDicePool(attrAvg, level)
          const supportPool = computeSupportPool(level)
          const isFavorite = favoriteSet.has(skill.id)

          return (
            <div
              key={skill.id}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                {(canFavorite || isFavorite) && (
                  <button
                    type="button"
                    onClick={
                      canFavorite ? () => onToggleFavorite(skill.id) : undefined
                    }
                    disabled={!canFavorite}
                    aria-pressed={isFavorite}
                    aria-label={
                      isFavorite
                        ? `Unfavorite ${skill.name}`
                        : `Favorite ${skill.name}`
                    }
                    title={isFavorite ? 'Remove favorite' : 'Mark as favorite'}
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition disabled:cursor-default ${
                      isFavorite
                        ? 'text-warning-900'
                        : 'text-gray-700 not-disabled:hover:text-warning-900'
                    }`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={isFavorite ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )}
                <span className="text-sm font-medium text-gray-1000">
                  {skill.name}
                </span>
              </div>
              <div className="flex h-6 w-16 items-center justify-center gap-1">
                {canEdit ? (
                  <InlineStepper
                    ariaLabel={skill.name}
                    value={level}
                    min={0}
                    max={MAX_SKILL_LEVEL}
                    onAdjust={(delta) =>
                      onSkillChange(
                        skill.id,
                        Math.max(0, Math.min(MAX_SKILL_LEVEL, level + delta)),
                      )
                    }
                  />
                ) : (
                  <span className="text-sm font-medium text-white">
                    {level}
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  setRolling({
                    mode: 'normal',
                    skillId: skill.id,
                    skillName: skill.name,
                    pool,
                  })
                }
                title={`Roll ${skill.name}`}
                className="flex w-[90px] cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-300 text-xs text-blue-1000">
                  {pool.standard}
                </span>
                {pool.aptitude > 0 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-success-300 text-xs text-success-1000">
                    {pool.aptitude}
                  </span>
                )}
                {pool.expertise > 0 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-warning-300 text-xs text-warning-1000">
                    {pool.expertise}
                  </span>
                )}
              </button>
              <button
                onClick={() =>
                  setRolling({
                    mode: 'support',
                    skillId: skill.id,
                    skillName: skill.name,
                    pool: supportPool,
                  })
                }
                title={`Roll as support for ${skill.name} (${supportPool.aptitude} aptitude die${supportPool.aptitude === 1 ? '' : 's'})`}
                className="flex w-[64px] cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-1000 hover:bg-gray-100"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-success-300 text-xs text-success-1000">
                  {supportPool.aptitude}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {rolling && (
        <DiceRoller
          gameId={gameId}
          characterId={characterId}
          skillId={rolling.skillId}
          skillName={rolling.skillName}
          pool={rolling.pool}
          mode={rolling.mode}
          supporterName={characterName}
          availableSupport={
            rolling.mode === 'normal'
              ? (availableSupport ?? []).filter(
                  (s) => s.skillId === rolling.skillId,
                )
              : undefined
          }
          edgeAvailable={rolling.mode === 'support' ? undefined : edgeAvailable}
          onSpendEdge={onSpendEdge}
          pendingBonuses={pendingBonuses}
          onApplyBonus={onApplyBonus}
          onConsumeBonuses={onConsumeBonuses}
          onRemoveBonus={onRemoveBonus}
          defaultHidden={defaultHidden}
          onClose={() => setRolling(null)}
        />
      )}
    </div>
  )
}
