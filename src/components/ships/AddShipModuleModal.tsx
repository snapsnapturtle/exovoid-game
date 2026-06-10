import { useMemo, useState } from 'react'
import { Badge } from '~/components/ui/Badge'
import { Modal } from '~/components/ui/Modal'
import { Input } from '~/components/ui/Input'
import {
  formatShipNumber,
  moduleAssetCost,
  moduleCapacityCost,
  modulePowerDelta,
  SHIP_MODULES,
  type ShipClass,
  type ShipSystem,
} from '~/lib/game-logic/ships'

interface AddShipModuleModalProps {
  /** Costs are class-dependent (multiplier × systems capacity), so the
   * catalog shows the numbers for the ship being edited. */
  shipClass: ShipClass
  onAdd: (mod: ShipSystem) => void
  onClose: () => void
}

const SYSTEM_TYPES = [...new Set(SHIP_MODULES.map((m) => m.systemType))]

export function AddShipModuleModal({
  shipClass,
  onAdd,
  onClose,
}: AddShipModuleModalProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SHIP_MODULES.filter((m) => {
      if (typeFilter && m.systemType !== typeFilter) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.systemType.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      )
    })
  }, [query, typeFilter])

  return (
    <Modal
      onClose={onClose}
      title="Add module"
      subtitle={`Capacity, power and cost shown for a ${shipClass.shipClass}.`}
      size="lg"
      stickyHeader={
        <div className="space-y-2">
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules…"
            className="w-full"
          />
          <div className="flex flex-wrap gap-1.5">
            {SYSTEM_TYPES.map((type) => (
              <Badge
                key={type}
                tone="accent"
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                selected={typeFilter === type}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>
      }
    >
      {matches.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-700">
          No modules match.
        </p>
      ) : (
        <ul className="space-y-1">
          {matches.map((mod) => {
            const cap = moduleCapacityCost(mod, shipClass)
            const power = modulePowerDelta(mod, cap)
            const cost = moduleAssetCost(mod, cap)
            return (
              <li key={mod.name}>
                <button
                  onClick={() => onAdd(mod)}
                  className="w-full rounded-lg border border-gray-400 bg-background-100/40 p-2 text-left transition hover:border-accent-700/50 hover:bg-accent-700/5"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-gray-700">
                      {mod.systemType}
                    </span>
                    <span className="font-medium text-white">{mod.name}</span>
                    <span className="text-xs text-gray-700">
                      {formatShipNumber(cap)} cap · {power >= 0 ? '+' : ''}
                      {formatShipNumber(power)} power · {formatShipNumber(cost)}{' '}
                      assets · r{mod.rarity}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-gray-900">
                    {mod.description}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
