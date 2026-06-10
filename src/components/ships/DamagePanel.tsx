import { Button } from '~/components/ui/Button'
import { Stepper } from '~/components/ui/Stepper'
import { InlineStepper } from '~/components/ui/InlineStepper'
import { FIRING_ARC_LABELS, FIRING_ARCS } from '~/lib/game-logic/ships'
import type { FiringArc, ShipDamage, ShipQuadrants } from '~/lib/types/database'

interface DamagePanelProps {
  damage: ShipDamage
  hullMax: number
  armorAllocation: ShipQuadrants
  shieldAllocation: ShipQuadrants
  hasShields: boolean
  onChange: (partial: Partial<ShipDamage>) => void
}

/** In-play damage tracking. `null` slots mean "undamaged" — they resolve to
 * the max (hull) / the allocation (quadrants) for display, and materialize
 * into concrete numbers on first adjustment. "Repair all" puts everything
 * back to null. */
export function DamagePanel({
  damage,
  hullMax,
  armorAllocation,
  shieldAllocation,
  hasShields,
  onChange,
}: DamagePanelProps) {
  const hullCurrent = damage.hullCurrent ?? hullMax
  const armorCurrent = damage.armorCurrent ?? armorAllocation
  const shieldCurrent = damage.shieldCurrent ?? shieldAllocation
  const pristine =
    damage.hullCurrent === null &&
    damage.armorCurrent === null &&
    damage.shieldCurrent === null

  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Damage</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              hullCurrent: null,
              armorCurrent: null,
              shieldCurrent: null,
            })
          }
          disabled={pristine}
        >
          Repair all
        </Button>
      </div>

      <Stepper
        label="Hull"
        value={hullCurrent}
        max={hullMax}
        min={0}
        onAdjust={(delta) =>
          onChange({
            hullCurrent: Math.max(0, Math.min(hullMax, hullCurrent + delta)),
          })
        }
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DamageQuadrants
          label="Armor"
          current={armorCurrent}
          allocation={armorAllocation}
          onAdjust={(arc, delta) =>
            onChange({
              armorCurrent: {
                ...armorCurrent,
                [arc]: Math.max(0, armorCurrent[arc] + delta),
              },
            })
          }
        />
        {hasShields && (
          <DamageQuadrants
            label="Shields"
            current={shieldCurrent}
            allocation={shieldAllocation}
            onAdjust={(arc, delta) =>
              onChange({
                shieldCurrent: {
                  ...shieldCurrent,
                  [arc]: Math.max(0, shieldCurrent[arc] + delta),
                },
              })
            }
          />
        )}
      </div>
    </div>
  )
}

interface DamageQuadrantsProps {
  label: string
  current: ShipQuadrants
  allocation: ShipQuadrants
  onAdjust: (arc: FiringArc, delta: number) => void
}

function DamageQuadrants({
  label,
  current,
  allocation,
  onAdjust,
}: DamageQuadrantsProps) {
  return (
    <div className="rounded-lg border border-gray-400 bg-background-100/40 p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-700">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FIRING_ARCS.map((arc) => {
          const damaged = current[arc] < allocation[arc]
          return (
            <div
              key={arc}
              className="flex flex-col items-center gap-0.5 rounded border border-gray-400 px-1 py-1.5"
            >
              <span className="text-[10px] uppercase tracking-wide text-gray-700">
                {FIRING_ARC_LABELS[arc]}
                <span className="ml-1 text-gray-700">/ {allocation[arc]}</span>
              </span>
              <InlineStepper
                value={current[arc]}
                min={0}
                max={allocation[arc]}
                ariaLabel={`${label} ${FIRING_ARC_LABELS[arc]} current`}
                valueClassName={`text-sm font-medium tabular-nums ${damaged ? 'text-warning-900' : 'text-white'}`}
                onAdjust={(delta) => onAdjust(arc, delta)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
