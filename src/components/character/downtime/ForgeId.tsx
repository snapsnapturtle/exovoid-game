import { useState } from 'react'
import type { Character } from '~/lib/types/domain'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import { SKILLS } from '~/lib/game-logic/skills'
import { computeAttributeAverage, computeDicePool } from '~/lib/game-logic/dice'
import { DiceRoller } from '~/components/dice/DiceRoller'
import { SkillPicker } from './SkillPicker'

interface Props {
  character: Character
  effects: AppliedPassiveEffects
  gameId: string
  characterId: string
  onCloseAll: () => void
}

const FORGE_ID_SKILL_IDS = ['computers', 'politics'] as const

export function ForgeId({
  character,
  effects,
  gameId,
  characterId,
  onCloseAll,
}: Props) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)

  const skill = selectedSkillId
    ? (SKILLS.find((s) => s.id === selectedSkillId) ?? null)
    : null

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
