import { useMemo, useState } from 'react'
import { Modal } from '~/components/ui/Modal'
import { Button } from '~/components/ui/Button'
import {
  armorModsFor,
  resolveArmorModCost,
  type ArmorModData,
} from '~/lib/game-logic/armor-mods'
import { effectiveArmorModLimit, type ArmorData } from '~/lib/game-logic/armors'
import type { InventoryItem } from '~/lib/types/domain'

interface ManageArmorModsModalProps {
  item: InventoryItem
  armor: ArmorData
  busy: boolean
  onSave: (mods: string[]) => void
  onClose: () => void
}

export function ManageArmorModsModal({
  item,
  armor,
  busy,
  onSave,
  onClose,
}: ManageArmorModsModalProps) {
  const available = useMemo(() => armorModsFor(armor), [armor])
  const limit = useMemo(
    () => effectiveArmorModLimit(armor, item.manufacturerRef),
    [armor, item.manufacturerRef],
  )
  const [selected, setSelected] = useState<string[]>(() => item.mods ?? [])

  function toggle(mod: ArmorModData) {
    setSelected((prev) =>
      prev.includes(mod.name)
        ? prev.filter((n) => n !== mod.name)
        : [...prev, mod.name],
    )
  }

  const overLimit = selected.length > limit
  const dirty =
    selected.length !== (item.mods?.length ?? 0) ||
    selected.some((n) => !item.mods?.includes(n))

  return (
    <Modal
      onClose={onClose}
      title={`Manage mods · ${item.name}`}
      subtitle={`${selected.length} / ${limit} mod slots used. Pick from the armor's allowed mod list.`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(selected)}
            disabled={busy || overLimit || !dirty}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      {available.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-700">
          This armor has no compatible mods.
        </p>
      ) : (
        <ul className="space-y-1">
          {available.map((mod) => {
            const isSelected = selected.includes(mod.name)
            const cost = resolveArmorModCost(mod, armor)
            const wouldExceed = !isSelected && selected.length >= limit
            return (
              <li key={mod.name}>
                <button
                  type="button"
                  onClick={() => toggle(mod)}
                  disabled={wouldExceed}
                  className={`w-full rounded-lg border p-2 text-left transition ${
                    isSelected
                      ? 'border-accent-700 bg-accent-700/15'
                      : wouldExceed
                        ? 'cursor-not-allowed border-gray-400 bg-background-100/40 opacity-40'
                        : 'border-gray-400 bg-background-100/40 hover:border-accent-700/50 hover:bg-accent-700/5'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-white">{mod.name}</span>
                    <div className="flex gap-3 text-[11px] text-gray-900">
                      {cost != null && <span>{cost.toLocaleString()} ¢</span>}
                      <span>Rarity {mod.rarity}</span>
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-xs text-gray-1000">
                    {mod.effects}
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
