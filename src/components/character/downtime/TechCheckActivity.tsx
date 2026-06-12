import { useCallback } from 'react'
import type { Character, PendingBonus } from '~/lib/types/domain'
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
  // Hooks must be declared before any early return — see React's Rules of
  // Hooks. The bonus callbacks are activity-agnostic so they're safe to
  // build unconditionally.
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
