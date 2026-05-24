import { useMemo, useState } from 'react'
import { allItems, type ItemData } from '~/lib/game-logic/items'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'

interface AddCatalogItemModalProps {
  busy: boolean
  onAdd: (input: { name: string; quantity: number; location?: string }) => void
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
    <Modal
      onClose={onClose}
      title="Add catalog item"
      subtitle="Pick an item from the rulebook catalog. Custom items have their own form."
      size="lg"
      stickyHeader={
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, category, description…"
          className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
        />
      }
      footerLeft={
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            aria-label="Quantity"
            className="w-20 rounded border border-gray-400 bg-gray-100 px-2 py-1 text-sm text-white focus:border-accent-900 focus:outline-none"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. backpack)"
            aria-label="Location (optional)"
            className="w-44 rounded border border-gray-400 bg-gray-100 px-2 py-1 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
          />
        </div>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selected || busy}>
            {busy ? 'Adding…' : selected ? `Add ${selected.name}` : 'Add'}
          </Button>
        </>
      }
    >
      {matches.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-700">
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
                      ? 'border-accent-700 bg-accent-700/15'
                      : 'border-gray-400 bg-background-100/40 hover:border-accent-700/50 hover:bg-accent-700/5'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-gray-700">
                      {it.category}
                    </span>
                    <span className="font-medium text-white">{it.name}</span>
                    <span className="text-xs text-gray-700">
                      {it.cost.toLocaleString()} ¢ · r{it.rarity}
                      {it.size > 0 && ` · size ${it.size}`}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-900">
                    {it.description}
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
