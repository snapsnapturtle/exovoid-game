import { useMemo, useState } from 'react'
import { Badge } from '~/components/ui/Badge'
import { Modal } from '~/components/ui/Modal'
import { Input } from '~/components/ui/Input'
import {
  formatShipNumber,
  SHIP_WEAPONS,
  type ShipWeapon,
} from '~/lib/game-logic/ships'

interface AddShipWeaponModalProps {
  onAdd: (weapon: ShipWeapon) => void
  onClose: () => void
}

const WEAPON_TYPES: ShipWeapon['type'][] = ['Arc Based', 'Turret']

export function AddShipWeaponModal({
  onAdd,
  onClose,
}: AddShipWeaponModalProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ShipWeapon['type'] | null>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SHIP_WEAPONS.filter((w) => {
      if (typeFilter && w.type !== typeFilter) return false
      if (!q) return true
      return (
        w.weapon.toLowerCase().includes(q) ||
        w.illustrativeName.toLowerCase().includes(q) ||
        w.damageType.toLowerCase().includes(q)
      )
    })
  }, [query, typeFilter])

  return (
    <Modal
      onClose={onClose}
      title="Add weapon"
      subtitle="Arc-based weapons fire into one quadrant; turrets cover 360°."
      size="lg"
      stickyHeader={
        <div className="space-y-2">
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search weapons…"
            className="w-full"
          />
          <div className="flex flex-wrap gap-1.5">
            {WEAPON_TYPES.map((type) => (
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
          No weapons match.
        </p>
      ) : (
        <ul className="space-y-1">
          {matches.map((w) => (
            <li key={w.weapon}>
              <button
                onClick={() => onAdd(w)}
                className="w-full rounded-lg border border-gray-400 bg-background-100/40 p-2 text-left transition hover:border-accent-700/50 hover:bg-accent-700/5"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-700">
                    {w.type}
                  </span>
                  <span className="font-medium text-white">{w.weapon}</span>
                  <span className="text-xs text-gray-700">
                    {w.illustrativeName}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-900">
                  {w.damage} {w.damageType.toLowerCase()} dmg · {w.attackAP} AP
                  {w.magazine !== null && ` · mag ${w.magazine}`}
                  {w.optimalRange && ` · range ${w.optimalRange}`}
                  {w.maxRange === null
                    ? ' (unlimited)'
                    : w.maxRange !== null && ` (max ${w.maxRange})`}
                </p>
                <p className="mt-0.5 text-xs text-gray-700">
                  {formatShipNumber(w.capacityCost)} cap ·{' '}
                  {w.powerRequirement > 0
                    ? `−${formatShipNumber(w.powerRequirement)} power · `
                    : ''}
                  {formatShipNumber(w.assetCost)} assets · r{w.rarity}
                  {w.qualities.length > 0 && ` · ${w.qualities.join(', ')}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
