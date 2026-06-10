import { useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Textarea } from '~/components/ui/Input'
import { ShipHeader } from './ShipHeader'
import { ShipStatsPanel } from './ShipStatsPanel'
import { ModulesPanel } from './ModulesPanel'
import { WeaponsPanel } from './WeaponsPanel'
import { QuadrantAllocator } from './QuadrantAllocator'
import { DamagePanel } from './DamagePanel'
import { useShip } from '~/lib/hooks/useShip'
import { computeShipStats, computeShipWarnings } from '~/lib/game-logic/ships'
import { deleteShip, duplicateShip } from '~/lib/server/ships'
import type { Ship } from '~/lib/types/database'

const gameRoute = getRouteApi('/_app/games/$gameId')

interface ShipSheetProps {
  initial: Ship
}

export function ShipSheet({ initial }: ShipSheetProps) {
  const { isGm } = gameRoute.useLoaderData()
  const navigate = useNavigate()
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { ship, updateField, updateConfig, updateDamage, flushSave } =
    useShip(initial)

  const stats = computeShipStats(ship.config)
  const warnings = computeShipWarnings(ship.config, stats)

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      await flushSave()
      const copy = await duplicateShip({ data: { shipId: ship.id } })
      navigate({
        to: '/games/$gameId/ships/$shipId',
        params: { gameId: ship.game_id, shipId: copy.id },
      })
    } finally {
      setDuplicating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteShip({ data: { shipId: ship.id } })
      navigate({ to: '/games/$gameId/ships', params: { gameId: ship.game_id } })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 p-6">
      <ShipHeader
        ship={ship}
        isGm={isGm}
        duplicating={duplicating}
        deleting={deleting}
        onNameChange={(v) => updateField('name', v)}
        onClassChange={(v) => updateConfig({ classRef: v })}
        onVariantChange={(v) => updateConfig({ variant: v })}
        onVisibilityChange={(v) => updateField('visible_to_players', v)}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      {stats && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <ModulesPanel
              modules={ship.config.modules}
              shipClass={stats.shipClass}
              onChange={(modules) => updateConfig({ modules })}
            />
            <WeaponsPanel
              weapons={ship.config.weapons}
              onChange={(weapons) => updateConfig({ weapons })}
            />
            <QuadrantAllocator
              armorAllocation={ship.config.armorAllocation}
              shieldAllocation={ship.config.shieldAllocation}
              armorMax={stats.armorMax.total}
              shieldMax={stats.shield?.points ?? 0}
              hasShields={stats.shield !== null}
              onArmorChange={(q) => updateConfig({ armorAllocation: q })}
              onShieldChange={(q) => updateConfig({ shieldAllocation: q })}
            />
          </div>
          <div className="space-y-4 lg:col-span-5">
            <ShipStatsPanel stats={stats} warnings={warnings} />
            <DamagePanel
              damage={ship.damage}
              hullMax={stats.hullMax.total}
              armorAllocation={ship.config.armorAllocation}
              shieldAllocation={ship.config.shieldAllocation}
              hasShields={stats.shield !== null}
              onChange={updateDamage}
            />
            <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-white">Notes</h3>
              <Textarea
                value={ship.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={4}
                placeholder="Registration, history, quirks…"
                className="w-full resize-y"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
