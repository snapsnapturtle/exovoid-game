import { useMemo, useState } from 'react'
import { Modal } from '~/components/ui/Modal'
import { Button } from '~/components/ui/Button'
import {
  effectiveWeaponModLimit,
  type WeaponData,
} from '~/lib/game-logic/weapons'
import {
  FIREARM_MOD_SLOTS,
  firearmModsConsumed,
  firearmModsForWeapon,
  isFirearmLike,
  lookupFirearmMod,
  validateFirearmModSelection,
  type FirearmModData,
  type FirearmModSlot,
} from '~/lib/game-logic/firearm-mods'
import {
  MELEE_MOD_SLOTS,
  allMeleeMods,
  lookupMeleeMod,
  resolveMeleeModCost,
  validateMeleeModSelection,
  type MeleeModData,
  type MeleeModSlot,
} from '~/lib/game-logic/melee-mods'
import type { InventoryItem } from '~/lib/types/database'

interface ManageWeaponModsModalProps {
  item: InventoryItem
  weapon: WeaponData
  busy: boolean
  onSave: (mods: string[]) => void
  onClose: () => void
}

export function ManageWeaponModsModal({
  item,
  weapon,
  busy,
  onSave,
  onClose,
}: ManageWeaponModsModalProps) {
  const isFirearm = isFirearmLike(weapon)
  const [draft, setDraft] = useState<string[]>(() => item.mods ?? [])

  const effectiveLimit = useMemo(
    () => effectiveWeaponModLimit(weapon, item.manufacturerRef, draft),
    [weapon, item.manufacturerRef, draft],
  )
  const consumed = useMemo(
    () => (isFirearm ? firearmModsConsumed(draft) : draft.length),
    [draft, isFirearm],
  )

  function toggle(name: string) {
    setDraft((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name],
    )
  }

  /**
   * A candidate mod is disabled when adding it would break slot uniqueness
   * or push consumed-count past the effective limit. Already-selected mods
   * stay enabled so the user can deselect.
   */
  function isDisabled(name: string): boolean {
    if (draft.includes(name)) return false
    const next = [...draft, name]
    const slotCheck = isFirearm
      ? validateFirearmModSelection(next)
      : validateMeleeModSelection(next)
    if (!slotCheck.ok) return true
    const nextConsumed = isFirearm ? firearmModsConsumed(next) : next.length
    const nextLimit = effectiveWeaponModLimit(
      weapon,
      item.manufacturerRef,
      next,
    )
    return nextConsumed > nextLimit
  }

  const dirty =
    draft.length !== (item.mods?.length ?? 0) ||
    draft.some((n) => !item.mods?.includes(n))

  const valid = isFirearm
    ? validateFirearmModSelection(draft).ok && consumed <= effectiveLimit
    : validateMeleeModSelection(draft).ok && draft.length <= effectiveLimit

  return (
    <Modal
      onClose={onClose}
      title={`Manage mods · ${item.name}`}
      subtitle={`${consumed} / ${effectiveLimit} mod slots used.${
        isFirearm
          ? ' Firearm mods are grouped by slot — one per slot, unless Dual Scope Mount unlocks a second Scopes pick.'
          : ' One mod per slot.'
      }`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(draft)}
            disabled={busy || !valid || !dirty}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      {isFirearm ? (
        <FirearmModPicker
          weapon={weapon}
          draft={draft}
          isDisabled={isDisabled}
          toggle={toggle}
        />
      ) : (
        <MeleeModPicker
          weapon={weapon}
          draft={draft}
          isDisabled={isDisabled}
          toggle={toggle}
        />
      )}
    </Modal>
  )
}

function FirearmModPicker({
  weapon,
  draft,
  isDisabled,
  toggle,
}: {
  weapon: WeaponData
  draft: string[]
  isDisabled: (name: string) => boolean
  toggle: (name: string) => void
}) {
  const available = useMemo(() => firearmModsForWeapon(weapon), [weapon])
  const groupedBySlot = useMemo(() => {
    const map = new Map<FirearmModSlot, FirearmModData[]>()
    for (const slot of FIREARM_MOD_SLOTS) map.set(slot, [])
    for (const mod of available) map.get(mod.slot)?.push(mod)
    return map
  }, [available])
  return (
    <div className="space-y-4">
      {FIREARM_MOD_SLOTS.map((slot) => {
        const mods = groupedBySlot.get(slot) ?? []
        if (mods.length === 0) return null
        const selectedInSlot = draft.filter(
          (n) => lookupFirearmMod(n)?.slot === slot,
        )
        return (
          <section key={slot}>
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-700">
              {slot}
              {selectedInSlot.length > 0 && (
                <span className="ml-2 text-gray-900">
                  ({selectedInSlot.length} selected)
                </span>
              )}
            </h4>
            <ul className="space-y-1">
              {mods.map((mod) => (
                <li key={mod.name}>
                  <ModCard
                    name={mod.name}
                    effects={mod.effects}
                    restrictions={mod.restrictions}
                    cost={mod.cost}
                    rarity={mod.rarity}
                    selected={draft.includes(mod.name)}
                    disabled={isDisabled(mod.name)}
                    onToggle={() => toggle(mod.name)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function MeleeModPicker({
  weapon,
  draft,
  isDisabled,
  toggle,
}: {
  weapon: WeaponData
  draft: string[]
  isDisabled: (name: string) => boolean
  toggle: (name: string) => void
}) {
  const mods = useMemo(() => allMeleeMods(), [])
  const groupedBySlot = useMemo(() => {
    const map = new Map<MeleeModSlot, MeleeModData[]>()
    for (const slot of MELEE_MOD_SLOTS) map.set(slot, [])
    for (const mod of mods) map.get(mod.slot)?.push(mod)
    return map
  }, [mods])
  return (
    <div className="space-y-4">
      {MELEE_MOD_SLOTS.map((slot) => {
        const slotMods = groupedBySlot.get(slot) ?? []
        if (slotMods.length === 0) return null
        const selectedInSlot = draft.filter(
          (n) => lookupMeleeMod(n)?.slot === slot,
        )
        return (
          <section key={slot}>
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-700">
              {slot}
              {selectedInSlot.length > 0 && (
                <span className="ml-2 text-gray-900">
                  ({selectedInSlot.length} selected)
                </span>
              )}
            </h4>
            <ul className="space-y-1">
              {slotMods.map((mod) => (
                <li key={mod.name}>
                  <ModCard
                    name={mod.name}
                    effects={mod.effects}
                    restrictions={mod.restrictions}
                    cost={resolveMeleeModCost(mod, weapon)}
                    rarity={mod.rarity}
                    selected={draft.includes(mod.name)}
                    disabled={isDisabled(mod.name)}
                    onToggle={() => toggle(mod.name)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function ModCard({
  name,
  effects,
  restrictions,
  cost,
  rarity,
  selected,
  disabled,
  onToggle,
}: {
  name: string
  effects: string
  restrictions: string | null
  cost: number | null
  rarity: number
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`w-full rounded-lg border p-2 text-left transition ${
        selected
          ? 'border-accent-700 bg-accent-700/15'
          : disabled
            ? 'cursor-not-allowed border-gray-400 bg-background-100/40 opacity-40'
            : 'border-gray-400 bg-background-100/40 hover:border-accent-700/50 hover:bg-accent-700/5'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-white">{name}</span>
        <div className="flex gap-3 text-[11px] text-gray-900">
          {cost != null && <span>{cost.toLocaleString()} ¢</span>}
          <span>Rarity {rarity}</span>
        </div>
      </div>
      <p className="mt-1 whitespace-pre-line text-xs text-gray-1000">
        {effects}
      </p>
      {restrictions && (
        <p className="mt-1 text-[11px] italic text-gray-700">
          {restrictions}
        </p>
      )}
    </button>
  )
}
