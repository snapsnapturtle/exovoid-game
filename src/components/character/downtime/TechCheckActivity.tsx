import { useCallback } from 'react'
import type { Character, PendingBonus } from '~/lib/types/database'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import { SKILLS } from '~/lib/game-logic/skills'
import { computeAttributeAverage, computeDicePool } from '~/lib/game-logic/dice'
import type { DowntimeActivity } from '~/lib/game-logic/downtime'
import { DiceRoller } from '~/components/dice/DiceRoller'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'

interface Props {
  activity: DowntimeActivity
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
  onUpdateField,
}: Props) {
  if (!activity.check) return null
  const skill = SKILLS.find((s) => s.id === activity.check!.skillId)
  if (!skill) return null

  const level = character.skills[skill.id] ?? 0
  const attrAvg = computeAttributeAverage(effects.attributes, skill.attributes)
  const pool = computeDicePool(attrAvg, level)

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

  return (
    <DiceRoller
      gameId={gameId}
      characterId={characterId}
      skillId={skill.id}
      skillName={skill.name}
      pool={pool}
      contextLabel={`Downtime · ${activity.name} (d${activity.check.difficulty})`}
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
