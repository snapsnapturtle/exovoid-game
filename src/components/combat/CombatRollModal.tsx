import { computeAttributeAverage, computeDicePool } from '~/lib/game-logic/dice'
import { SKILLS } from '~/lib/game-logic/skills'
import { DiceRoller } from '~/components/dice/DiceRoller'
import type { CharacterAttributes, PendingBonus } from '~/lib/types/domain'
import type { WeaponData } from '~/lib/game-logic/weapons'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'

interface CombatRollModalProps {
  gameId: string
  characterId: string
  /** Effective attributes after passive effects (computed by the caller). */
  effectiveAttributes: CharacterAttributes
  skills: Record<string, number>
  /** Skill id from SKILLS — falls back to a 1-die roll with no aptitude when unknown. */
  skillId: string
  /** Pool modifier pre-applied in the modal (e.g. -3 for Dodge/Parry). */
  initialModifier?: number
  /** AP cost shown in the modal footer and debited via onApCommit. */
  apCost: number
  /** Short tag rendered under the title, e.g. "Combat · Attack — Plasma Pistol". */
  contextLabel?: string
  /** Weapon being used (for attack actions) — its triggerOptions surface in the result panel. */
  weapon?: WeaponData
  /** Fires when the roll persists. Use to debit AP and apply any other side effects. */
  onApCommit: () => Promise<void> | void
  /** Current Edge available — enables Edge spend buttons in the modal.
   * Pass `undefined` for NPCs to hide the affordance entirely. */
  edgeAvailable: number | undefined
  /** Decrement Edge by 1 — wired from the participant card. */
  onSpendEdge: () => void
  pendingBonuses: PendingBonus[]
  onApplyBonus: (bonus: ApplyBonusInput) => string
  onConsumeBonuses: (ids: string[]) => void
  onRemoveBonus: (id: string) => void
  /** Initial state for the "Hidden roll" checkbox — true for hidden NPCs. */
  defaultHidden?: boolean
  onClose: () => void
}

/**
 * Combat-scoped wrapper around DiceRoller. Derives the skill pool from the
 * character's effective attributes + skill level, sets the AP cost chip
 * and any rulebook pool modifier (e.g. -3 for Dodge/Parry), and wires
 * onAfterRoll to debit AP from the participant.
 */
export function CombatRollModal({
  gameId,
  characterId,
  effectiveAttributes,
  skills,
  skillId,
  initialModifier,
  apCost,
  contextLabel,
  weapon,
  onApCommit,
  edgeAvailable,
  onSpendEdge,
  pendingBonuses,
  onApplyBonus,
  onConsumeBonuses,
  onRemoveBonus,
  defaultHidden,
  onClose,
}: CombatRollModalProps) {
  const skill = SKILLS.find((s) => s.id === skillId)
  const skillName = skill?.name ?? skillId
  const level = skills[skillId] ?? 0
  const attrAvg = skill
    ? computeAttributeAverage(effectiveAttributes, skill.attributes)
    : 0
  const pool = computeDicePool(attrAvg, level)

  return (
    <DiceRoller
      gameId={gameId}
      characterId={characterId}
      skillName={skillName}
      pool={pool}
      apCost={apCost}
      initialModifier={initialModifier}
      contextLabel={contextLabel}
      weaponTriggers={weapon?.triggerOptions}
      showCombatTriggers
      edgeAvailable={edgeAvailable}
      onSpendEdge={onSpendEdge}
      pendingBonuses={pendingBonuses}
      onApplyBonus={onApplyBonus}
      onConsumeBonuses={onConsumeBonuses}
      onRemoveBonus={onRemoveBonus}
      defaultHidden={defaultHidden}
      onAfterRoll={onApCommit}
      onClose={onClose}
    />
  )
}
