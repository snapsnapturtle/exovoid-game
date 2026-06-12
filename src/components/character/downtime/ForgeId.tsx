import { useCallback, useState } from 'react'
import type { Character, PendingBonus } from '~/lib/types/domain'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import { SKILLS } from '~/lib/game-logic/skills'
import { computeAttributeAverage, computeDicePool } from '~/lib/game-logic/dice'
import { DiceRoller } from '~/components/dice/DiceRoller'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'
import { SkillPicker } from './SkillPicker'

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

  return (
    <SkillPicker
      skillIds={FORGE_ID_SKILL_IDS}
      skills={character.skills}
      hint="Roll Computers or Politics — each downtime advances one. Track total successes in your notes; you need the quality level on both before the ID is ready."
      onSelect={setSelectedSkillId}
    />
  )
}
