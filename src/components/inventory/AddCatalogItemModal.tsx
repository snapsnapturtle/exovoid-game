import { useMemo, useState } from 'react'
import { allItems, type ItemData } from '~/lib/game-logic/items'
import { Button } from '~/components/ui/Button'

interface AddCatalogItemModalProps {
  busy: boolean
  onAdd: (input: {
    name: string
    quantity: number
    location?: string
  }) => void
  onClose: () => void
}

export function AddCatalogItemModal({
  busy,
  onAdd,
  onClose,
}: AddCatalogItemModalProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ItemData | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [location, setLocation] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = allItems()
    if (!q) return all.slice(0, 80)
    return all.filter(
      (i) =>
        i.category.toLowerCase().includes(q) ||
        i.item.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    )
  }, [query])

  function handleAdd() {
    if (!selected || busy) return
    onAdd({
      name: selected.name,
      quantity,
      location: location.trim() || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-void-600 bg-void-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-void-700 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Add catalog item
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Pick an item from the rulebook catalog. Custom items have their
              own form.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="border-b border-void-700 px-5 py-3">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, category, description…"
            className="w-full rounded-lg border border-void-600 bg-void-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No items match.
            </p>
          ) : (
            <ul className="space-y-1">
              {matches.map((it) => {
                const isSelected = selected?.name === it.name
                return (
                  <li key={it.name}>
                    <button
                      onClick={() => setSelected(it)}
                      className={`w-full rounded-lg border p-2 text-left transition ${
                        isSelected
                          ? 'border-accent-500 bg-accent-500/15'
                          : 'border-void-700 bg-void-900/40 hover:border-accent-500/50 hover:bg-accent-500/5'
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          {it.category}
                        </span>
                        <span className="font-medium text-white">{it.name}</span>
                        <span className="text-xs text-gray-500">
                          {it.cost.toLocaleString()} ¢ · r{it.rarity}
                          {it.size > 0 && ` · size ${it.size}`}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">
                        {it.description}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="flex flex-wrap items-end justify-between gap-3 border-t border-void-700 px-5 py-3">
          <div className="flex gap-3">
            <label className="text-xs text-gray-400">
              <span className="block">Quantity</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="mt-1 w-20 rounded border border-void-600 bg-void-700 px-2 py-1 text-sm text-white focus:border-accent-400 focus:outline-none"
              />
            </label>
            <label className="text-xs text-gray-400">
              <span className="block">Location (optional)</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. backpack"
                className="mt-1 w-44 rounded border border-void-600 bg-void-700 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selected || busy}>
              {busy ? 'Adding…' : selected ? `Add ${selected.name}` : 'Add'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
