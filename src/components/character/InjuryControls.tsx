import { useState } from 'react'
import { Button } from '~/components/ui/Button'
import { InjurySummary } from './InjurySummary'
import { RollForInjuryModal } from './RollForInjuryModal'
import type { InjuryEntry } from '~/lib/types/database'

interface InjuryControlsProps {
  gameId: string
  characterId: string
  injuries: InjuryEntry[]
  edgeCurrent: number
  /** Hard cap for edge after applying adrenaline (defaults to no cap). */
  edgeHardMax?: number
  canEdit: boolean
  /** True for minion NPCs — the injury die "minion" face counts as a wound
   * on the modal's roll, so they drop fast on light hits. */
  isMinion?: boolean
  /** Default the injury roll's `is_hidden` to true. Set when the target is
   * a hidden NPC, so the roll doesn't leak the NPC's existence through the
   * dice feed. */
  defaultHidden?: boolean
  onInjuriesChange: (next: InjuryEntry[]) => void
  onEdgeChange: (next: number) => void
}

/**
 * Shared injury affordance — the summary chip + "Roll for injury" button +
 * roll modal. Embeddable on the character sheet (via LivePlayPanel) and the
 * combat participant card. The parent owns the persistence; this component
 * just emits the next desired state on apply / treat / remove.
 */
export function InjuryControls({
  gameId,
  characterId,
  injuries,
  edgeCurrent,
  edgeHardMax,
  canEdit,
  isMinion = false,
  defaultHidden = false,
  onInjuriesChange,
  onEdgeChange,
}: InjuryControlsProps) {
  const [rollOpen, setRollOpen] = useState(false)

  function handleApply(injury: InjuryEntry | null, adrenalineToAdd: number) {
    if (injury) onInjuriesChange([...injuries, injury])
    if (adrenalineToAdd > 0) {
      const next = edgeCurrent + adrenalineToAdd
      onEdgeChange(
        edgeHardMax !== undefined ? Math.min(edgeHardMax, next) : next,
      )
    }
  }

  function handleTreat(id: string, treated: boolean) {
    onInjuriesChange(injuries.map((i) => (i.id === id ? { ...i, treated } : i)))
  }

  function handleRemove(id: string) {
    onInjuriesChange(injuries.filter((i) => i.id !== id))
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <InjurySummary
          injuries={injuries}
          canEdit={canEdit}
          onTreat={handleTreat}
          onRemove={handleRemove}
        />
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRollOpen(true)}
            className="ml-auto shrink-0"
          >
            Roll for injury
          </Button>
        )}
      </div>
      {rollOpen && (
        <RollForInjuryModal
          gameId={gameId}
          characterId={characterId}
          currentInjuries={injuries}
          edgeCurrent={edgeCurrent}
          isMinion={isMinion}
          isHidden={defaultHidden}
          onApply={handleApply}
          onClose={() => setRollOpen(false)}
        />
      )}
    </>
  )
}
