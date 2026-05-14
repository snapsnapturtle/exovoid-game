import { edgeCap } from '~/lib/game-logic/derived-stats'
import { Stepper } from '~/components/ui/Stepper'

interface LivePlayPanelProps {
  healthMax: number
  healthCurrent: number | null
  edgeMax: number
  edgeCurrent: number
  canEdit: boolean
  onHealthChange: (value: number | null) => void
  onEdgeChange: (value: number) => void
}

/**
 * Compact health + edge trackers for the top stats band.
 * Always editable when the user has permission, regardless of the
 * sheet's edit/play mode toggle.
 */
export function LivePlayPanel({
  healthMax,
  healthCurrent,
  edgeMax,
  edgeCurrent,
  canEdit,
  onHealthChange,
  onEdgeChange,
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
    <div className="grid grid-cols-2 gap-2">
      <Stepper
        label="Health"
        value={currentHealth}
        max={healthMax}
        min={0}
        canEdit={canEdit}
        onAdjust={adjustHealth}
      />
      <Stepper
        label="Edge"
        value={edgeCurrent}
        max={edgeMax}
        hardMax={edgeHardMax}
        min={0}
        canEdit={canEdit}
        onAdjust={adjustEdge}
      />
    </div>
  )
}
