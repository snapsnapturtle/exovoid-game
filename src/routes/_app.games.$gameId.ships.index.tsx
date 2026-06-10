import {
  createFileRoute,
  getRouteApi,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { IconRocket } from '@tabler/icons-react'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'
import { Modal } from '~/components/ui/Modal'
import { surfaceCardClasses, SurfaceArrow } from '~/components/ui/Surface'
import { createShip } from '~/lib/server/ships'
import {
  computeShipStats,
  formatShipNumber,
  SHIP_CLASSES,
} from '~/lib/game-logic/ships'
import type { Ship } from '~/lib/types/database'

const gameRoute = getRouteApi('/_app/games/$gameId')
const shipsRoute = getRouteApi('/_app/games/$gameId/ships')

export const Route = createFileRoute('/_app/games/$gameId/ships/')({
  component: ShipRosterPage,
})

function ShipRosterPage() {
  const { game } = gameRoute.useLoaderData()
  const { ships } = shipsRoute.useLoaderData()
  const [creating, setCreating] = useState(false)

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Ships</h2>
          <p className="mt-1 text-sm text-gray-900">
            The fleet belongs to the whole table — anyone can build and refit.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New ship</Button>
      </div>

      {ships.length === 0 ? (
        <div className="rounded-xl border border-gray-400 bg-background-200 p-10 text-center">
          <p className="text-sm text-gray-900">
            No ships yet. Build the party's first vessel.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ships.map((ship) => (
            <li key={ship.id}>
              <ShipCard ship={ship} gameId={game.id} />
            </li>
          ))}
        </ul>
      )}

      {creating && <NewShipModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function ShipCard({ ship, gameId }: { ship: Ship; gameId: string }) {
  const stats = computeShipStats(ship.config)
  return (
    <Link
      to="/games/$gameId/ships/$shipId"
      params={{ gameId, shipId: ship.id }}
      className={surfaceCardClasses()}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-700/20 text-accent-900">
        <IconRocket size={20} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-medium text-white">{ship.name}</p>
          {!ship.visible_to_players && (
            <Badge tone="neutral" uppercase title="Hidden from other players">
              Hidden
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-900">
          {ship.config.classRef}
          {stats && (
            <>
              <span className="mx-1.5 text-gray-700">·</span>
              <span className="text-gray-700">
                {formatShipNumber(stats.totalAssetCost)} assets
              </span>
            </>
          )}
        </p>
      </div>
      <SurfaceArrow />
    </Link>
  )
}

function NewShipModal({ onClose }: { onClose: () => void }) {
  const { game } = gameRoute.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [name, setName] = useState('')
  const [classRef, setClassRef] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim() || !classRef || busy) return
    setBusy(true)
    setError(null)
    try {
      const ship = await createShip({
        data: { gameId: game.id, name, classRef },
      })
      await router.invalidate()
      navigate({
        to: '/games/$gameId/ships/$shipId',
        params: { gameId: game.id, shipId: ship.id },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ship')
      setBusy(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title="New ship"
      subtitle="Pick a hull class — everything else is configured on the ship page."
      size="lg"
      footerLeft={
        error ? <p className="text-xs text-danger-900">{error}</p> : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !classRef || busy}
          >
            {busy ? 'Creating…' : 'Create ship'}
          </Button>
        </>
      }
    >
      <label className="mb-4 block">
        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-700">
          Name
        </span>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="USC Karakum"
          className="w-full"
        />
      </label>

      <ul className="grid gap-2 sm:grid-cols-2">
        {SHIP_CLASSES.map((cls) => {
          const selected = classRef === cls.shipClass
          return (
            <li key={cls.shipClass}>
              <button
                type="button"
                onClick={() => setClassRef(cls.shipClass)}
                aria-pressed={selected}
                className={`w-full rounded-lg border border-gray-400 bg-background-100/40 p-3 text-left transition hover:border-gray-500 ${
                  selected ? 'ring-2 ring-accent-900' : ''
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-white">
                    {cls.shipClass}
                  </span>
                  <span className="text-xs text-gray-700">
                    {cls.assetCost} assets · r{cls.rarity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-900">
                  Hull {cls.hull} · armor {cls.armorDurability} · speed{' '}
                  {cls.speed} · capacity {cls.systemsCapacity} · bridge{' '}
                  {cls.bridgeSize}
                </p>
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
