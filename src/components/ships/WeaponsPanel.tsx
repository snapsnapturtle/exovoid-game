import { useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { Button } from '~/components/ui/Button'
import { AddShipWeaponModal } from './AddShipWeaponModal'
import {
  FIRING_ARC_LABELS,
  FIRING_ARCS,
  formatShipNumber,
  getShipWeapon,
  type ShipWeapon,
} from '~/lib/game-logic/ships'
import type { FiringArc, ShipWeaponEntry } from '~/lib/types/database'

interface WeaponsPanelProps {
  weapons: ShipWeaponEntry[]
  onChange: (weapons: ShipWeaponEntry[]) => void
}

export function WeaponsPanel({ weapons, onChange }: WeaponsPanelProps) {
  const [adding, setAdding] = useState(false)

  function addWeapon(weapon: ShipWeapon) {
    onChange([
      ...weapons,
      {
        id: crypto.randomUUID(),
        weaponRef: weapon.weapon,
        name: weapon.illustrativeName,
      },
    ])
    setAdding(false)
  }

  function removeWeapon(id: string) {
    onChange(weapons.filter((w) => w.id !== id))
  }

  function setArc(id: string, arc: FiringArc) {
    onChange(weapons.map((w) => (w.id === id ? { ...w, arc } : w)))
  }

  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Weapons
          <span className="ml-2 text-xs font-normal text-gray-700">
            {weapons.length}
          </span>
        </h3>
        <Button size="sm" onClick={() => setAdding(true)}>
          Add weapon
        </Button>
      </div>

      {weapons.length === 0 ? (
        <p className="text-sm text-gray-700">
          No weapons mounted. The shipyard awaits your order.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {weapons.map((entry) => {
            const weapon = getShipWeapon(entry.weaponRef)
            if (!weapon) return null
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-gray-400 bg-background-100/40 px-2.5 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {entry.name ?? weapon.illustrativeName}
                      <span className="ml-1.5 text-xs font-normal text-gray-700">
                        {weapon.weapon}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-900">
                      {weapon.damage} {weapon.damageType.toLowerCase()} dmg ·{' '}
                      {weapon.attackAP} AP
                      {weapon.magazine !== null && ` · mag ${weapon.magazine}`}
                      {weapon.optimalRange &&
                        ` · range ${weapon.optimalRange}`}{' '}
                      · {formatShipNumber(weapon.capacityCost)} cap
                      {weapon.powerRequirement > 0 &&
                        ` · −${formatShipNumber(weapon.powerRequirement)} pwr`}{' '}
                      · {formatShipNumber(weapon.assetCost)} assets
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => removeWeapon(entry.id)}
                    aria-label={`Remove ${entry.name ?? weapon.weapon}`}
                    className="w-5 shrink-0 px-0"
                  >
                    <IconX size={12} aria-hidden />
                  </Button>
                </div>
                <div className="mt-1.5">
                  {weapon.type === 'Turret' ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-700">
                      Turret · 360°
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-gray-700">
                        Arc
                      </span>
                      {FIRING_ARCS.map((arc) => {
                        const selected = entry.arc === arc
                        return (
                          <button
                            key={arc}
                            type="button"
                            onClick={() => setArc(entry.id, arc)}
                            aria-pressed={selected}
                            className={`rounded border px-1.5 py-[2px] text-[10px]/[14px] transition-colors ${
                              selected
                                ? 'border-accent-600 bg-accent-300 text-white'
                                : 'border-gray-400 text-gray-900 hover:border-accent-500 hover:bg-accent-200'
                            }`}
                          >
                            {FIRING_ARC_LABELS[arc]}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {adding && (
        <AddShipWeaponModal
          onAdd={addWeapon}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}
