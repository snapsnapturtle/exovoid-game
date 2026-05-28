import { useCallback, useState } from 'react'
import type { Character, PendingBonus } from '~/lib/types/database'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import { SKILLS } from '~/lib/game-logic/skills'
import { computeAttributeAverage, computeDicePool } from '~/lib/game-logic/dice'
import { DiceRoller } from '~/components/dice/DiceRoller'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'

interface Props {
  character: Character
  effects: AppliedPassiveEffects
  gameId: string
  characterId: string
  onCloseAll: () => void
  onUpdateField: <K extends keyof Character>(
    key: K,
    value: Character[K],
  ) => void
}

const FORGE_ID_SKILL_IDS = ['computers', 'politics'] as const

export function ForgeId({
  character,
  effects,
  gameId,
  characterId,
  onCloseAll,
  onUpdateField,
}: Props) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)

  const skill = selectedSkillId
    ? (SKILLS.find((s) => s.id === selectedSkillId) ?? null)
    : null

  const applyBonus = useCallback(
    (bonus: ApplyBonusInput): string => {
      const entry: PendingBonus = {
        id: crypto.randomUUID(),
        label: bonus.label,
        modifier: bonus.modifier,
        source: bonus.source,
        addedAt: new Date().toISOString(),
      }
      onUpdateField('pending_bonuses', [...character.pending_bonuses, entry])
      return entry.id
    },
    [character.pending_bonuses, onUpdateField],
  )

  const consumeBonuses = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      const drop = new Set(ids)
      onUpdateField(
        'pending_bonuses',
        character.pending_bonuses.filter((b) => !drop.has(b.id)),
      )
    },
    [character.pending_bonuses, onUpdateField],
  )

  const removeBonus = useCallback(
    (id: string) => consumeBonuses([id]),
    [consumeBonuses],
  )

  if (skill) {
    const level = character.skills[skill.id] ?? 0
    const attrAvg = computeAttributeAverage(
      effects.attributes,
      skill.attributes,
    )
    const pool = computeDicePool(attrAvg, level)
    return (
      <DiceRoller
        gameId={gameId}
        characterId={characterId}
        skillId={skill.id}
        skillName={skill.name}
        pool={pool}
        contextLabel="Downtime · Forge ID"
        edgeAvailable={character.edge_current}
        onSpendEdge={() =>
          onUpdateField('edge_current', Math.max(0, character.edge_current - 1))
        }
        pendingBonuses={character.pending_bonuses}
        onApplyBonus={applyBonus}
        onConsumeBonuses={consumeBonuses}
        onRemoveBonus={removeBonus}
        onClose={onCloseAll}
      />
    )
  }

  const options = FORGE_ID_SKILL_IDS.map((id) =>
    SKILLS.find((s) => s.id === id),
  ).filter((s): s is (typeof SKILLS)[number] => Boolean(s))

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-1000">
        Roll Computers or Politics — each downtime advances one. Track total
        successes in your notes; you need the quality level on both before the
        ID is ready.
      </p>
      <ul className="space-y-1">
        {options.map((s) => {
          const level = character.skills[s.id] ?? 0
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedSkillId(s.id)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-400 bg-background-100 px-3 py-2 text-sm text-gray-1000 transition hover:border-accent-700 hover:bg-gray-100 hover:text-white"
              >
                <span className="font-medium">{s.name}</span>
                <span className="tabular-nums text-gray-700">
                  Level {level}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
