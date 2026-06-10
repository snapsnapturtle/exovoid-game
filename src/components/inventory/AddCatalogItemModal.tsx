import { useMemo, useState } from 'react'
import { allItems, type ItemData } from '~/lib/game-logic/items'
import { Stat } from './Stat'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'
import { Input } from '~/components/ui/Input'

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
        <Input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, category, description…"
          className="w-full"
        />
      }
      footerLeft={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            size="md"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            aria-label="Quantity"
            className="w-20"
          />
          <Input
            type="text"
            size="md"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. backpack)"
            aria-label="Location (optional)"
            className="w-44"
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
                    <span className="font-medium text-white">{it.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-700">
                      {it.category}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-900">
                    <Stat label="Cost">{it.cost.toLocaleString()} ¢</Stat>
                    <Stat label="Rarity">{it.rarity}</Stat>
                    {it.size > 0 && <Stat label="Size">{it.size}</Stat>}
                  </div>
                  {it.description && (
                    <p className="mt-2 whitespace-pre-line text-xs text-gray-1000">
                      {it.description}
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
