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
  isGm: boolean
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
  isGm,
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
    <div className="rounded-xl border border-void-600 bg-void-800 p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">Skills</h3>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter skills..."
          className="w-48 rounded-lg border border-void-600 bg-void-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-2 text-xs text-gray-500">
          <span>Skill</span>
          <span className="w-16 text-center">Level</span>
          <span className="w-12 text-center">Attr</span>
          <span className="w-32 text-center">Dice Pool</span>
          <span className="w-16 text-center">Roll</span>
        </div>
        {filtered.map((skill) => {
          const level = skills[skill.id] ?? 0
          const attrAvg = computeAttributeAverage(attributes, skill.attributes)
          const pool = computeDicePool(attrAvg, level)

          return (
            <div
              key={skill.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-void-700"
            >
              <div>
                <span className="text-sm font-medium text-gray-200">
                  {skill.name}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {skill.attributes.map(attrAbbr).join(' / ')}
                </span>
              </div>
              <div className="flex w-16 items-center justify-center gap-1">
                {canEdit ? (
                  <>
                    <button
                      onClick={() =>
                        onSkillChange(skill.id, Math.max(0, level - 1))
                      }
                      disabled={level <= 0}
                      className="flex h-6 w-6 items-center justify-center rounded bg-void-600 text-xs text-gray-300 hover:bg-void-500 disabled:opacity-30"
                    >
                      -
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
                      className="flex h-6 w-6 items-center justify-center rounded bg-void-600 text-xs text-gray-300 hover:bg-void-500 disabled:opacity-30"
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
              <div className="w-12 text-center text-sm text-gray-400">
                {attrAvg}
              </div>
              <div className="flex w-32 items-center justify-center gap-1.5 text-xs">
                <span className="rounded bg-gray-600/40 px-1.5 py-0.5 text-gray-300">
                  {pool.standard}S
                </span>
                {pool.aptitude > 0 && (
                  <span className="rounded bg-cyan-600/30 px-1.5 py-0.5 text-cyber-400">
                    {pool.aptitude}A
                  </span>
                )}
                {pool.expertise > 0 && (
                  <span className="rounded bg-accent-600/30 px-1.5 py-0.5 text-accent-400">
                    {pool.expertise}E
                  </span>
                )}
              </div>
              <div className="flex w-16 justify-center">
                <button
                  onClick={() =>
                    setRolling({ skillName: skill.name, pool })
                  }
                  className="rounded bg-accent-500/20 px-2 py-1 text-xs font-medium text-accent-400 transition hover:bg-accent-500/30"
                >
                  Roll
                </button>
              </div>
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
          isGm={isGm}
          onClose={() => setRolling(null)}
        />
      )}
    </div>
  )
}
