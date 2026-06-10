import { InlineStepper } from '~/components/ui/InlineStepper'
import {
  FIRING_ARC_LABELS,
  FIRING_ARCS,
  quadrantTotal,
} from '~/lib/game-logic/ships'
import type { FiringArc, ShipQuadrants } from '~/lib/types/database'

interface QuadrantAllocatorProps {
  armorAllocation: ShipQuadrants
  shieldAllocation: ShipQuadrants
  armorMax: number
  shieldMax: number
  hasShields: boolean
  onArmorChange: (q: ShipQuadrants) => void
  onShieldChange: (q: ShipQuadrants) => void
}

/** Build-time distribution of armor durability and shield points across the
 * four combat quadrants (rulebook §"Armor & Shield Quadrants"). Over-
 * allocation renders the pool readout in warning tone but never blocks. */
export function QuadrantAllocator({
  armorAllocation,
  shieldAllocation,
  armorMax,
  shieldMax,
  hasShields,
  onArmorChange,
  onShieldChange,
}: QuadrantAllocatorProps) {
  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <h3 className="text-sm font-semibold text-white">Quadrants</h3>
      <p className="mt-1 text-xs text-gray-900">
        Distribute armor and shield points across the four arcs. Attacks damage
        the quadrant they strike; hull damage is global.
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <QuadrantGrid
          label="Armor"
          allocation={armorAllocation}
          pool={armorMax}
          onChange={onArmorChange}
        />
        {hasShields || quadrantTotal(shieldAllocation) > 0 ? (
          <QuadrantGrid
            label="Shields"
            allocation={shieldAllocation}
            pool={shieldMax}
            onChange={onShieldChange}
          />
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-gray-400 bg-background-100/40 p-3">
            <p className="text-center text-xs text-gray-700">
              No shield system installed.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface QuadrantGridProps {
  label: string
  allocation: ShipQuadrants
  pool: number
  onChange: (q: ShipQuadrants) => void
}

function QuadrantGrid({
  label,
  allocation,
  pool,
  onChange,
}: QuadrantGridProps) {
  const allocated = quadrantTotal(allocation)
  const remaining = pool - allocated

  function adjust(arc: FiringArc, delta: number) {
    onChange({ ...allocation, [arc]: Math.max(0, allocation[arc] + delta) })
  }

  return (
    <div className="rounded-lg border border-gray-400 bg-background-100/40 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-700">
          {label}
        </span>
        <span
          className={`text-xs tabular-nums ${remaining < 0 ? 'text-warning-900' : 'text-gray-900'}`}
        >
          {allocated} / {pool}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {FIRING_ARCS.map((arc) => (
          <div
            key={arc}
            className="flex flex-col items-center gap-0.5 rounded border border-gray-400 px-1 py-1.5"
          >
            <span className="text-[10px] uppercase tracking-wide text-gray-700">
              {FIRING_ARC_LABELS[arc]}
            </span>
            <InlineStepper
              value={allocation[arc]}
              min={0}
              ariaLabel={`${label} ${FIRING_ARC_LABELS[arc]}`}
              onAdjust={(delta) => adjust(arc, delta)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
