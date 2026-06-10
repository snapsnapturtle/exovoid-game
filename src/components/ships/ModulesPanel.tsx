import { useMemo, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { Button } from '~/components/ui/Button'
import { AddShipModuleModal } from './AddShipModuleModal'
import {
  formatShipNumber,
  getShipModule,
  moduleAssetCost,
  moduleCapacityCost,
  modulePowerDelta,
  type ShipClass,
  type ShipSystem,
} from '~/lib/game-logic/ships'
import type { ShipModuleEntry } from '~/lib/types/database'

interface ModulesPanelProps {
  modules: ShipModuleEntry[]
  shipClass: ShipClass
  onChange: (modules: ShipModuleEntry[]) => void
}

export function ModulesPanel({
  modules,
  shipClass,
  onChange,
}: ModulesPanelProps) {
  const [adding, setAdding] = useState(false)

  function addModule(mod: ShipSystem) {
    onChange([...modules, { id: crypto.randomUUID(), moduleRef: mod.name }])
    setAdding(false)
  }

  function removeModule(id: string) {
    onChange(modules.filter((m) => m.id !== id))
  }

  // Group installed modules by systemType, preserving catalog group order.
  const groups = useMemo(() => {
    const byType = new Map<
      string,
      { entry: ShipModuleEntry; mod: ShipSystem }[]
    >()
    for (const entry of modules) {
      const mod = getShipModule(entry.moduleRef)
      if (!mod) continue
      if (!byType.has(mod.systemType)) byType.set(mod.systemType, [])
      byType.get(mod.systemType)!.push({ entry, mod })
    }
    return [...byType.entries()]
  }, [modules])

  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Modules
          <span className="ml-2 text-xs font-normal text-gray-700">
            {modules.length}
          </span>
        </h3>
        <Button size="sm" onClick={() => setAdding(true)}>
          Add module
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-700">
          No modules installed. Reactors, thrusters and quarters live here.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map(([type, entries]) => (
            <section key={type}>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                {type}
              </h4>
              <ul className="space-y-1">
                {entries.map(({ entry, mod }) => {
                  const cap = moduleCapacityCost(mod, shipClass)
                  const power = modulePowerDelta(mod, cap)
                  const cost = moduleAssetCost(mod, cap)
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-400 bg-background-100/40 px-2 py-1.5"
                    >
                      <span
                        className="min-w-0 flex-1 truncate text-sm text-white"
                        title={mod.description}
                      >
                        {mod.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-gray-700">
                        {formatShipNumber(cap)} cap · {power >= 0 ? '+' : ''}
                        {formatShipNumber(power)} pwr · {formatShipNumber(cost)}{' '}
                        assets
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => removeModule(entry.id)}
                        aria-label={`Remove ${mod.name}`}
                        className="w-5 shrink-0 px-0"
                      >
                        <IconX size={12} aria-hidden />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {adding && (
        <AddShipModuleModal
          shipClass={shipClass}
          onAdd={addModule}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}
