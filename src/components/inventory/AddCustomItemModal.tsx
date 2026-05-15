import { useState } from 'react'
import { Button } from '~/components/ui/Button'

interface AddCustomItemModalProps {
  busy: boolean
  onAdd: (input: {
    name: string
    quantity: number
    description?: string
    location?: string
  }) => void
  onClose: () => void
}

export function AddCustomItemModal({
  busy,
  onAdd,
  onClose,
}: AddCustomItemModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [location, setLocation] = useState('')

  const canSubmit = name.trim().length > 0 && quantity >= 1 && !busy

  function handleAdd() {
    if (!canSubmit) return
    onAdd({
      name: name.trim(),
      quantity,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
    })
  }

  return (
    <div
      className="modal-backdrop-in fixed backdrop-blur-sm inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md modal-card-in rounded-xl border border-void-600 bg-void-800"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-void-600 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Add custom item
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Free-text item, e.g. a mission-specific object or trinket.
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

        <div className="space-y-3 px-5 py-4">
          <label className="block text-xs text-gray-400">
            Name
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. cursed amulet"
              className="mt-1 w-full rounded border border-void-600 bg-void-700 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-gray-400">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is it, where did it come from…"
              className="mt-1 w-full rounded border border-void-600 bg-void-700 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
            />
          </label>
          <div className="flex gap-3">
            <label className="block text-xs text-gray-400">
              <span className="block">Quantity</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="mt-1 w-20 rounded border border-void-600 bg-void-700 px-2 py-1.5 text-sm text-white focus:border-accent-400 focus:outline-none"
              />
            </label>
            <label className="block flex-1 text-xs text-gray-400">
              <span className="block">Location (optional)</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. backpack"
                className="mt-1 w-full rounded border border-void-600 bg-void-700 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
              />
            </label>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-void-600 px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!canSubmit}>
            {busy ? 'Adding…' : 'Add item'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
