import { Link } from '@tanstack/react-router'
import type { InventoryItem } from '~/lib/types/database'
import { inventoryByLocation, lookupItem } from '~/lib/game-logic/items'

interface InventoryTabProps {
  inventory: InventoryItem[]
  credits: number
  assets: number
  gameId: string
  characterId: string
  canEdit: boolean
}

export function InventoryTab({
  inventory,
  credits,
  assets,
  gameId,
  characterId,
  canEdit,
}: InventoryTabProps) {
  const groups = inventoryByLocation(inventory)
  const totalQty = inventory.reduce((s, i) => s + i.quantity, 0)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3 text-sm">
          <span className="font-mono font-semibold text-white">
            {credits.toLocaleString()}
            <span className="ml-0.5 text-xs text-gray-500">¢</span>
          </span>
          <span className="font-mono font-semibold text-white">
            {assets.toLocaleString()}
            <span className="ml-0.5 text-xs text-gray-500">⬡</span>
          </span>
          <span className="text-xs text-gray-500">
            · {totalQty} item{totalQty === 1 ? '' : 's'}
          </span>
        </div>
        {canEdit && (
          <Link
            to="/games/$gameId/characters/$characterId/inventory"
            params={{ gameId, characterId }}
            className="rounded-lg border border-accent-500 bg-accent-500/10 px-3 py-1.5 text-sm text-accent-300 transition hover:bg-accent-500/20"
          >
            Manage inventory →
          </Link>
        )}
      </div>

      {inventory.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No items yet.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.location}>
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                {g.location}
              </div>
              <ul className="space-y-1">
                {g.items.map((it) => {
                  const catalog =
                    it.source === 'catalog' ? lookupItem(it.name) : undefined
                  return (
                    <li
                      key={it.id}
                      className="flex items-baseline justify-between rounded border border-void-600 bg-void-700/40 px-2 py-1.5 text-sm"
                    >
                      <span className="text-white">
                        {it.name}
                        {catalog && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-500">
                            {catalog.category}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-xs text-gray-400">
                        ×{it.quantity}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
