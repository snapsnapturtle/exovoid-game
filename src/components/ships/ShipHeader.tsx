import { useState } from 'react'
import { IconCopy, IconTrash } from '@tabler/icons-react'
import { Button } from '~/components/ui/Button'
import { Input, Select } from '~/components/ui/Input'
import { Checkbox } from '~/components/ui/Checkbox'
import { Modal } from '~/components/ui/Modal'
import { Badge } from '~/components/ui/Badge'
import { SHIP_CLASSES, SHIP_VARIANT_LABELS } from '~/lib/game-logic/ships'
import type { Ship, ShipVariant } from '~/lib/types/database'

interface ShipHeaderProps {
  ship: Ship
  isGm: boolean
  duplicating: boolean
  deleting: boolean
  onNameChange: (name: string) => void
  onClassChange: (classRef: string) => void
  onVariantChange: (variant: ShipVariant) => void
  onVisibilityChange: (visible: boolean) => void
  onDuplicate: () => void
  onDelete: () => void
}

export function ShipHeader({
  ship,
  isGm,
  duplicating,
  deleting,
  onNameChange,
  onClassChange,
  onVariantChange,
  onVisibilityChange,
  onDuplicate,
  onDelete,
}: ShipHeaderProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-700">
            Name
          </span>
          <Input
            value={ship.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ship name"
            className="w-full"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-700">
            Class
          </span>
          <Select
            value={ship.config.classRef}
            onChange={(e) => onClassChange(e.target.value)}
          >
            {SHIP_CLASSES.map((c) => (
              <option key={c.shipClass} value={c.shipClass}>
                {c.shipClass}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-700">
            Variant
          </span>
          <Select
            value={ship.config.variant}
            onChange={(e) => onVariantChange(e.target.value as ShipVariant)}
          >
            {(
              Object.entries(SHIP_VARIANT_LABELS) as [ShipVariant, string][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          {!ship.visible_to_players && (
            <Badge tone="neutral" uppercase title="Hidden from other players">
              Hidden
            </Badge>
          )}
          <Button
            variant="secondary"
            onClick={onDuplicate}
            disabled={duplicating}
            className="gap-1.5"
          >
            <IconCopy size={16} aria-hidden />
            <span>{duplicating ? 'Duplicating…' : 'Duplicate'}</span>
          </Button>
          <Button
            variant="danger"
            onClick={() => setConfirmingDelete(true)}
            disabled={deleting}
            className="gap-1.5"
          >
            <IconTrash size={16} aria-hidden />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {isGm && (
        <div className="mt-3 border-t border-gray-400 pt-3">
          <Checkbox
            label="Visible to players"
            checked={ship.visible_to_players}
            onChange={(e) => onVisibilityChange(e.target.checked)}
          />
        </div>
      )}

      {confirmingDelete && (
        <Modal
          onClose={() => setConfirmingDelete(false)}
          title="Delete ship"
          size="sm"
          align="center"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={onDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete ship'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-1000">
            Delete <span className="font-medium text-white">{ship.name}</span>?
            The build configuration is lost for everyone in the game.
          </p>
        </Modal>
      )}
    </div>
  )
}
