import type { Character } from '~/lib/types/domain'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import { SKILLS } from '~/lib/game-logic/skills'
import { computeAttributeAverage, computeDicePool } from '~/lib/game-logic/dice'
import type { DowntimeActivity } from '~/lib/game-logic/downtime'
import { DiceRoller } from '~/components/dice/DiceRoller'

interface Props {
  activity: DowntimeActivity
  character: Character
  effects: AppliedPassiveEffects
  gameId: string
  characterId: string
  onCloseAll: () => void
}

// Modify Gear and Repair Gear share this shell — both pre-fill a Tech check
// at the activity's listed difficulty and let the player read the success
// count against it. Outcomes are roll-and-narrate today; the "damaged" state
// machine that would auto-apply Repair Gear successes lives in a separate
// issue.
export function TechCheckActivity({
  activity,
  character,
  effects,
  gameId,
  characterId,
  onCloseAll,
}: Props) {
  if (!activity.check) return null
  // Hoist past the early return so TS keeps the narrowed type inside the
  // SKILLS.find callback (closures lose flow-narrowing across boundaries).
  const check = activity.check
  const skill = SKILLS.find((s) => s.id === check.skillId)
  if (!skill) return null

  const level = character.skills[skill.id] ?? 0
  const attrAvg = computeAttributeAverage(effects.attributes, skill.attributes)
  const pool = computeDicePool(attrAvg, level)

  return (
    <DiceRoller
      gameId={gameId}
      characterId={characterId}
      skillId={skill.id}
      skillName={skill.name}
      pool={pool}
      contextLabel={`Downtime · ${activity.name} (d${check.difficulty})`}
      onClose={onCloseAll}
    />
  )
}
