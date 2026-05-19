import { Link } from '@tanstack/react-router'
import type { InventoryItem } from '~/lib/types/database'
import { inventoryByLocation, lookupItem } from '~/lib/game-logic/items'
import { buttonClasses } from '~/components/ui/Button'

interface InventoryTabProps {
  inventory: InventoryItem[]
  credits: number
  assets: number
  gameId: string
  characterId: string
}

export function InventoryTab({
  inventory,
  credits,
  assets,
  gameId,
  characterId,
}: InventoryTabProps) {
  const groups = inventoryByLocation(inventory)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3 text-sm">
          <span className="font-semibold text-white">
            {credits.toLocaleString()}
            <span className="ml-0.5 text-xs text-gray-700">¢</span>
          </span>
          <span className="font-semibold text-white">
            {assets.toLocaleString()}
            <span className="ml-0.5 text-xs text-gray-700">⬡</span>
          </span>
        </div>
        <Link
          to="/games/$gameId/characters/$characterId/inventory"
          params={{ gameId, characterId }}
          className={buttonClasses('secondary', 'sm')}
        >
          Manage inventory
        </Link>
      </div>

      {inventory.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-700">
          No items yet.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.location}>
              <div className="mb-1 text-xs uppercase tracking-wide text-gray-700">
                {g.location}
              </div>
              <ul className="space-y-1">
                {g.items.map((it) => {
                  const catalog =
                    it.source === 'catalog' ? lookupItem(it.name) : undefined
                  return (
                    <li
                      key={it.id}
                      className="flex items-baseline justify-between rounded border border-gray-400 bg-gray-100/40 px-2 py-1.5 text-sm"
                    >
                      <span className="text-white">
                        {it.name}
                        {catalog && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-700">
                            {catalog.category}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-900">
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
