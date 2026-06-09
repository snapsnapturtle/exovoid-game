import { useState } from 'react'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'
import { Input, Textarea } from '~/components/ui/Input'

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
          <Button onClick={handleAdd} disabled={!canSubmit}>
            {busy ? 'Adding…' : 'Add item'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-xs text-gray-900">
          Name
          <Input
            autoFocus
            type="text"
            size="md"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. cursed amulet"
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-xs text-gray-900">
          Description (optional)
          <Textarea
            size="md"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is it, where did it come from…"
            className="mt-1 w-full"
          />
        </label>
      </div>
    </Modal>
  )
}
