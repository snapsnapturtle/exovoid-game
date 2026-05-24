import { useState } from 'react'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'

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
    <Modal
      onClose={onClose}
      title="Add custom item"
      subtitle="Free-text item, e.g. a mission-specific object or trinket."
      size="lg"
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
          <Button onClick={handleAdd} disabled={!canSubmit}>
            {busy ? 'Adding…' : 'Add item'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-xs text-gray-900">
          Name
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. cursed amulet"
            className="mt-1 w-full rounded border border-gray-400 bg-gray-100 px-2 py-1.5 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
          />
        </label>
        <label className="block text-xs text-gray-900">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is it, where did it come from…"
            className="mt-1 w-full rounded border border-gray-400 bg-gray-100 px-2 py-1.5 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
          />
        </label>
      </div>
    </Modal>
  )
}
