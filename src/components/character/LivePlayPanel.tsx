import { edgeCap } from '~/lib/game-logic/derived-stats'
import { Stepper } from '~/components/ui/Stepper'
import { InjuryControls } from './InjuryControls'
import type { InjuryEntry } from '~/lib/types/database'

interface LivePlayPanelProps {
  gameId: string
  characterId: string
  healthMax: number
  healthCurrent: number | null
  edgeMax: number
  edgeCurrent: number
  injuries: InjuryEntry[]
  canEdit: boolean
  onHealthChange: (value: number | null) => void
  onEdgeChange: (value: number) => void
  onInjuriesChange: (next: InjuryEntry[]) => void
}

/**
 * Compact edge + health trackers for the top stats band, plus the carried
 * injury summary and the "Roll for injury" affordance. Always editable when
 * the user has permission, regardless of the sheet's edit/play mode toggle.
 */
export function LivePlayPanel({
  gameId,
  characterId,
  healthMax,
  healthCurrent,
  edgeMax,
  edgeCurrent,
  injuries,
  canEdit,
  onHealthChange,
  onEdgeChange,
  onInjuriesChange,
}: LivePlayPanelProps) {
  const currentHealth = healthCurrent ?? healthMax
  const edgeHardMax = edgeCap(edgeMax)

  function adjustHealth(delta: number) {
    const next = currentHealth + delta
    onHealthChange(next >= healthMax ? null : Math.max(0, next))
  }

  function adjustEdge(delta: number) {
    // Edge can legally exceed the normal max via Seek Inspiration,
    // Assess Opportunities, and Make Battle Plan — capped at +50%.
    onEdgeChange(Math.max(0, Math.min(edgeHardMax, edgeCurrent + delta)))
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Stepper
          label="Edge"
          value={edgeCurrent}
          max={edgeMax}
          hardMax={edgeHardMax}
          min={0}
          canEdit={canEdit}
          onAdjust={adjustEdge}
        />
        <Stepper
          label="Health"
          value={currentHealth}
          max={healthMax}
          min={0}
          canEdit={canEdit}
          onAdjust={adjustHealth}
        />
      </div>
      <InjuryControls
        gameId={gameId}
        characterId={characterId}
        injuries={injuries}
        edgeCurrent={edgeCurrent}
        edgeHardMax={edgeHardMax}
        canEdit={canEdit}
        onInjuriesChange={onInjuriesChange}
        onEdgeChange={onEdgeChange}
      />
    </div>
  )
}
