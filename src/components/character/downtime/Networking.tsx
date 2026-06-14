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

export function Networking({
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
        contextLabel="Downtime · Networking (d2)"
        onClose={onCloseAll}
      />
    )
  }

  return (
    <SkillPicker
      skills={character.skills}
      hint="Pick the skill that best matches what you're trying to achieve, then roll at difficulty 2."
      onSelect={setSelectedSkillId}
    />
  )
}
