import { useState } from 'react'
import { Button } from '~/components/ui/Button'
import { COMBAT_ACTIONS, type CombatAction } from '~/data/combat-actions'
import { CombatRollModal } from './CombatRollModal'
import type { CharacterAttributes, PendingBonus } from '~/lib/types/domain'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'

interface ActionPanelProps {
  gameId: string
  characterId: string
  effectiveAttributes: CharacterAttributes
  skills: Record<string, number>
  canEdit: boolean
  /** Called to debit AP. Used for both direct actions and as the post-roll commit. */
  onDebitAp: (amount: number) => void | Promise<void>
  /** Current Edge available — passed into the roll modal for Edge spend
   * buttons. Pass `undefined` for NPCs to hide the affordance entirely. */
  edgeAvailable: number | undefined
  /** Decrement Edge by 1 — fired by Edge spend buttons in the roll modal. */
  onSpendEdge: () => void
  pendingBonuses: PendingBonus[]
  onApplyBonus: (bonus: ApplyBonusInput) => string
  onConsumeBonuses: (ids: string[]) => void
  onRemoveBonus: (id: string) => void
  /** Initial state for the "Hidden roll" checkbox — true for hidden NPCs. */
  defaultHidden?: boolean
}

/**
 * Per-participant grid of general combat actions (rulebook §214 minus the
 * weapon-bound ones, which live next to each equipped weapon). Direct
 * actions debit AP on click; roll actions open a `<CombatRollModal>`
 * pre-configured with the action's skill, pool modifier, and AP cost.
 */
export function ActionPanel({
  gameId,
  characterId,
  effectiveAttributes,
  skills,
  canEdit,
  onDebitAp,
  edgeAvailable,
  onSpendEdge,
  pendingBonuses,
  onApplyBonus,
  onConsumeBonuses,
  onRemoveBonus,
  defaultHidden,
}: ActionPanelProps) {
  const [rolling, setRolling] = useState<CombatAction | null>(null)

  function handleClick(action: CombatAction) {
    if (!canEdit) return
    if (action.kind === 'direct') {
      void onDebitAp(action.apCost)
      return
    }
    setRolling(action)
  }

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
        General actions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {COMBAT_ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant="subtle"
            size="sm"
            disabled={!canEdit}
            onClick={() => handleClick(action)}
            title={action.description}
            className="gap-1.5"
          >
            <span>{action.name}</span>
            <span className="rounded bg-background-100/40 px-1 py-0.5 text-[10px] tabular-nums text-gray-1000">
              {action.apCost} AP
            </span>
          </Button>
        ))}
      </div>

      {rolling && (
        <CombatRollModal
          gameId={gameId}
          characterId={characterId}
          effectiveAttributes={effectiveAttributes}
          skills={skills}
          skillId={rolling.skillId ?? ''}
          initialModifier={rolling.poolModifier}
          apCost={rolling.apCost}
          contextLabel={`Combat · ${rolling.name}`}
          edgeAvailable={edgeAvailable}
          onSpendEdge={onSpendEdge}
          pendingBonuses={pendingBonuses}
          onApplyBonus={onApplyBonus}
          onConsumeBonuses={onConsumeBonuses}
          onRemoveBonus={onRemoveBonus}
          defaultHidden={defaultHidden}
          onApCommit={() => onDebitAp(rolling.apCost)}
          onClose={() => setRolling(null)}
        />
      )}
    </div>
  )
}
