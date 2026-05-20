import { useState } from 'react'
import type { CharacterAttributes } from '~/lib/types/database'
import { SKILLS, MAX_SKILL_LEVEL } from '~/lib/game-logic/skills'
import { ATTRIBUTE_DEFINITIONS } from '~/lib/game-logic/attributes'
import {
  computeAttributeAverage,
  computeDicePool,
  type DicePool,
} from '~/lib/game-logic/dice'
import type { AttributeId } from '~/lib/game-logic/attributes'
import { DiceRoller } from '~/components/dice/DiceRoller'

interface SkillsPanelProps {
  attributes: CharacterAttributes
  skills: Record<string, number>
  canEdit: boolean
  onSkillChange: (skillId: string, value: number) => void
  gameId: string
  characterId: string
}

function attrAbbr(id: AttributeId): string {
  return ATTRIBUTE_DEFINITIONS.find((a) => a.id === id)?.abbr ?? id.toUpperCase()
}

export function SkillsPanel({
  attributes,
  skills,
  canEdit,
  onSkillChange,
  gameId,
  characterId,
}: SkillsPanelProps) {
  const [filter, setFilter] = useState('')
  const [rolling, setRolling] = useState<{
    skillName: string
    pool: DicePool
  } | null>(null)

  const filtered = filter
    ? SKILLS.filter((s) =>
        s.name.toLowerCase().includes(filter.toLowerCase()),
      )
    : SKILLS

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
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 text-xs text-gray-700">
          <span>Skill</span>
          <span className="w-16 text-center">Level</span>
          <span className="w-[90px] pl-2 text-left">Roll</span>
        </div>
        {filtered.map((skill) => {
          const level = skills[skill.id] ?? 0
          const attrAvg = computeAttributeAverage(attributes, skill.attributes)
          const pool = computeDicePool(attrAvg, level)

          return (
            <div
              key={skill.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
            >
              <div>
                <span className="text-sm font-medium text-gray-1000">
                  {skill.name}
                </span>
                <span className="ml-2 text-xs text-gray-700">
                  {skill.attributes.map(attrAbbr).join(' / ')}
                </span>
              </div>
              <div className="flex h-6 w-16 items-center justify-center gap-1">
                {canEdit ? (
                  <>
                    <button
                      onClick={() =>
                        onSkillChange(skill.id, Math.max(0, level - 1))
                      }
                      disabled={level <= 0}
                      aria-label={`Decrease ${skill.name}`}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center text-sm font-medium text-white">
                      {level}
                    </span>
                    <button
                      onClick={() =>
                        onSkillChange(
                          skill.id,
                          Math.min(MAX_SKILL_LEVEL, level + 1),
                        )
                      }
                      disabled={level >= MAX_SKILL_LEVEL}
                      aria-label={`Increase ${skill.name}`}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      +
                    </button>
                  </>
                ) : (
                  <span className="text-sm font-medium text-white">
                    {level}
                  </span>
                )}
              </div>
              <button
                onClick={() => setRolling({ skillName: skill.name, pool })}
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
            </div>
          )
        })}
      </div>

      {rolling && (
        <DiceRoller
          gameId={gameId}
          characterId={characterId}
          skillName={rolling.skillName}
          pool={rolling.pool}
          onClose={() => setRolling(null)}
        />
      )}
    </div>
  )
}
