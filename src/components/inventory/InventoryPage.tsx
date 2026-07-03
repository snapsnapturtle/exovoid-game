import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { IconCash, IconCurrencyDollar } from '@tabler/icons-react'
import { EffectTooltip } from './EffectTooltip'
import type { Character, GameState, InventoryItem } from '~/lib/types/domain'
import { inventoryByLocation, lookupItem } from '~/lib/game-logic/items'
import {
  effectiveWeaponModLimit,
  lookupWeapon,
  type WeaponData,
} from '~/lib/game-logic/weapons'
import {
  effectiveArmorModLimit,
  lookupArmor,
  type ArmorData,
} from '~/lib/game-logic/armors'
import { lookupManufacturer } from '~/lib/game-logic/manufacturers'
import { lookupArmorMod } from '~/lib/game-logic/armor-mods'
import {
  firearmModsConsumed,
  isFirearmLike,
  lookupFirearmMod,
} from '~/lib/game-logic/firearm-mods'
import { lookupMeleeMod } from '~/lib/game-logic/melee-mods'
import {
  addArmor,
  addInventoryItem,
  addWeapon,
  removeInventoryItem,
  setCurrency,
  setEquipped,
  transferInventoryItem,
  updateInventoryItem,
} from '~/lib/server/inventory'
import { AddCatalogItemModal } from './AddCatalogItemModal'
import { AddCustomItemModal } from './AddCustomItemModal'
import { AddWeaponModal } from './AddWeaponModal'
import { AddArmorModal } from './AddArmorModal'
import { ManageArmorModsModal } from './ManageArmorModsModal'
import { ManageWeaponModsModal } from './ManageWeaponModsModal'
import { Alert } from '~/components/ui/Alert'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { InlineStepper } from '~/components/ui/InlineStepper'
import { Input } from '~/components/ui/Input'
import { SegmentedControl } from '~/components/ui/SegmentedControl'
import { QualityBadge } from './QualityBadge'

type Owner =
  { type: 'character'; characterId: string } | { type: 'game'; gameId: string }

interface InventoryPageProps {
  character: Character
  gameState: GameState
  canEdit: boolean
}

export function InventoryPage({
  character,
  gameState,
  canEdit,
}: InventoryPageProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [addModal, setAddModal] = useState<
    | { kind: 'catalog'; owner: Owner }
    | { kind: 'custom'; owner: Owner }
    | { kind: 'weapon'; owner: Owner }
    | { kind: 'armor'; owner: Owner }
    | null
  >(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<'mine' | 'party'>('mine')
  const [modsModal, setModsModal] = useState<
    | { kind: 'armor'; item: InventoryItem; armor: ArmorData; owner: Owner }
    | { kind: 'weapon'; item: InventoryItem; weapon: WeaponData; owner: Owner }
    | null
  >(null)

  const characterOwner: Owner = {
    type: 'character',
    characterId: character.id,
  }
  const gameOwner: Owner = { type: 'game', gameId: gameState.game_id }

  async function withBusy<T>(key: string, fn: () => Promise<T>) {
    if (busyId) return
    setBusyId(key)
    setError(null)
    try {
      await fn()
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  function openModsModal(item: InventoryItem, owner: Owner) {
    if (item.source === 'armor' && item.armorRef) {
      const armor = lookupArmor(item.armorRef)
      if (armor) setModsModal({ kind: 'armor', item, armor, owner })
      return
    }
    if (item.source === 'weapon' && item.weaponRef) {
      const weapon = lookupWeapon(item.weaponRef)
      // Throwing weapons (modLimit 0) skip the mod modal entirely.
      if (weapon && weapon.type !== 'Throwing') {
        setModsModal({ kind: 'weapon', item, weapon, owner })
      }
    }
  }

  function confirmRemove(item: InventoryItem, owner: Owner) {
    const qty = item.quantity > 1 ? ` ×${item.quantity}` : ''
    if (!window.confirm(`Remove ${item.name}${qty}? This cannot be undone.`)) {
      return
    }
    void withBusy(`remove:${item.id}`, () =>
      removeInventoryItem({ data: { owner, itemId: item.id } }),
    )
  }

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
      </header>

      {error && <Alert>{error}</Alert>}

      <CurrencyBar
        characterCredits={character.credits}
        characterAssets={character.assets}
        partyCredits={gameState.credits}
        partyAssets={gameState.assets}
        canEdit={canEdit}
        busy={busyId !== null}
        onSetCharacter={(updates) =>
          withBusy('currency:character', () =>
            setCurrency({ data: { owner: characterOwner, ...updates } }),
          )
        }
        onSetParty={(updates) =>
          withBusy('currency:party', () =>
            setCurrency({ data: { owner: gameOwner, ...updates } }),
          )
        }
      />

      <SegmentedControl
        size="md"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mine', label: 'Mine', badge: character.inventory.length },
          {
            value: 'party',
            label: 'Party',
            badge: gameState.inventory.length,
          },
        ]}
      />

      {tab === 'mine' ? (
        <InventoryColumn
          title={`${character.name || 'Character'}'s inventory`}
          items={character.inventory}
          canEdit={canEdit}
          busyId={busyId}
          onAddCatalog={() =>
            setAddModal({ kind: 'catalog', owner: characterOwner })
          }
          onAddCustom={() =>
            setAddModal({ kind: 'custom', owner: characterOwner })
          }
          onAddWeapon={() =>
            setAddModal({ kind: 'weapon', owner: characterOwner })
          }
          onAddArmor={() =>
            setAddModal({ kind: 'armor', owner: characterOwner })
          }
          onUpdateQuantity={(item, quantity) =>
            withBusy(`update:${item.id}`, () =>
              updateInventoryItem({
                data: {
                  owner: characterOwner,
                  itemId: item.id,
                  updates: { quantity },
                },
              }),
            )
          }
          onUpdateDurability={(item, currentDurability) =>
            withBusy(`update:${item.id}`, () =>
              updateInventoryItem({
                data: {
                  owner: characterOwner,
                  itemId: item.id,
                  updates: { currentDurability },
                },
              }),
            )
          }
          onRename={(item, name) =>
            withBusy(`update:${item.id}`, () =>
              updateInventoryItem({
                data: {
                  owner: characterOwner,
                  itemId: item.id,
                  updates: { name },
                },
              }),
            )
          }
          onUpdateLocation={(item, location) =>
            withBusy(`update:${item.id}`, () =>
              updateInventoryItem({
                data: {
                  owner: characterOwner,
                  itemId: item.id,
                  updates: { location },
                },
              }),
            )
          }
          onTransfer={(item) =>
            withBusy(`transfer:${item.id}`, () =>
              transferInventoryItem({
                data: { from: characterOwner, to: gameOwner, itemId: item.id },
              }),
            )
          }
          transferLabel="→ Party"
          onRemove={(item) => confirmRemove(item, characterOwner)}
          onManageMods={(item) => openModsModal(item, characterOwner)}
          onToggleEquipped={(item, equipped) =>
            withBusy(`equip:${item.id}`, () =>
              setEquipped({
                data: { characterId: character.id, itemId: item.id, equipped },
              }),
            )
          }
        />
      ) : (
        <InventoryColumn
          title="Party inventory"
          items={gameState.inventory}
          canEdit={canEdit}
          busyId={busyId}
          onAddCatalog={() =>
            setAddModal({ kind: 'catalog', owner: gameOwner })
          }
          onAddCustom={() => setAddModal({ kind: 'custom', owner: gameOwner })}
          onAddWeapon={() => setAddModal({ kind: 'weapon', owner: gameOwner })}
          onAddArmor={() => setAddModal({ kind: 'armor', owner: gameOwner })}
          onUpdateQuantity={(item, quantity) =>
            withBusy(`update:${item.id}`, () =>
              updateInventoryItem({
                data: {
                  owner: gameOwner,
                  itemId: item.id,
                  updates: { quantity },
                },
              }),
            )
          }
          onUpdateDurability={(item, currentDurability) =>
            withBusy(`update:${item.id}`, () =>
              updateInventoryItem({
                data: {
                  owner: gameOwner,
                  itemId: item.id,
                  updates: { currentDurability },
                },
              }),
            )
          }
          onRename={(item, name) =>
            withBusy(`update:${item.id}`, () =>
              updateInventoryItem({
                data: { owner: gameOwner, itemId: item.id, updates: { name } },
              }),
            )
          }
          onUpdateLocation={(item, location) =>
            withBusy(`update:${item.id}`, () =>
              updateInventoryItem({
                data: {
                  owner: gameOwner,
                  itemId: item.id,
                  updates: { location },
                },
              }),
            )
          }
          onTransfer={(item) =>
            withBusy(`transfer:${item.id}`, () =>
              transferInventoryItem({
                data: { from: gameOwner, to: characterOwner, itemId: item.id },
              }),
            )
          }
          transferLabel="← Me"
          onRemove={(item) => confirmRemove(item, gameOwner)}
          onManageMods={(item) => openModsModal(item, gameOwner)}
        />
      )}

      {addModal?.kind === 'catalog' && (
        <AddCatalogItemModal
          busy={busyId !== null}
          onAdd={(input) =>
            withBusy('add', async () => {
              await addInventoryItem({
                data: {
                  owner: addModal.owner,
                  source: 'catalog',
                  ...input,
                },
              })
              setAddModal(null)
            })
          }
          onClose={() => setAddModal(null)}
        />
      )}
      {addModal?.kind === 'custom' && (
        <AddCustomItemModal
          busy={busyId !== null}
          onAdd={(input) =>
            withBusy('add', async () => {
              await addInventoryItem({
                data: {
                  owner: addModal.owner,
                  source: 'custom',
                  ...input,
                },
              })
              setAddModal(null)
            })
          }
          onClose={() => setAddModal(null)}
        />
      )}
      {addModal?.kind === 'weapon' && (
        <AddWeaponModal
          busy={busyId !== null}
          onAdd={(input) =>
            withBusy('add', async () => {
              await addWeapon({ data: { owner: addModal.owner, ...input } })
              setAddModal(null)
            })
          }
          onClose={() => setAddModal(null)}
        />
      )}
      {addModal?.kind === 'armor' && (
        <AddArmorModal
          busy={busyId !== null}
          onAdd={(input) =>
            withBusy('add', async () => {
              await addArmor({ data: { owner: addModal.owner, ...input } })
              setAddModal(null)
            })
          }
          onClose={() => setAddModal(null)}
        />
      )}
      {modsModal?.kind === 'armor' && (
        <ManageArmorModsModal
          item={modsModal.item}
          armor={modsModal.armor}
          busy={busyId !== null}
          onSave={(mods) =>
            withBusy(`mods:${modsModal.item.id}`, async () => {
              await updateInventoryItem({
                data: {
                  owner: modsModal.owner,
                  itemId: modsModal.item.id,
                  updates: { mods },
                },
              })
              setModsModal(null)
            })
          }
          onClose={() => setModsModal(null)}
        />
      )}
      {modsModal?.kind === 'weapon' && (
        <ManageWeaponModsModal
          item={modsModal.item}
          weapon={modsModal.weapon}
          busy={busyId !== null}
          onSave={(mods) =>
            withBusy(`mods:${modsModal.item.id}`, async () => {
              await updateInventoryItem({
                data: {
                  owner: modsModal.owner,
                  itemId: modsModal.item.id,
                  updates: { mods },
                },
              })
              setModsModal(null)
            })
          }
          onClose={() => setModsModal(null)}
        />
      )}
    </div>
  )
}

interface CurrencyBarProps {
  characterCredits: number
  characterAssets: number
  partyCredits: number
  partyAssets: number
  canEdit: boolean
  busy: boolean
  onSetCharacter: (updates: { credits?: number; assets?: number }) => void
  onSetParty: (updates: { credits?: number; assets?: number }) => void
}

function CurrencyBar({
  characterCredits,
  characterAssets,
  partyCredits,
  partyAssets,
  canEdit,
  busy,
  onSetCharacter,
  onSetParty,
}: CurrencyBarProps) {
  return (
    <section className="grid gap-3 rounded-xl border border-gray-400 bg-background-200 p-4 sm:grid-cols-2">
      <CurrencyGroup
        label="Mine"
        credits={characterCredits}
        assets={characterAssets}
        canEdit={canEdit}
        busy={busy}
        onSet={onSetCharacter}
      />
      <CurrencyGroup
        label="Party"
        credits={partyCredits}
        assets={partyAssets}
        canEdit={canEdit}
        busy={busy}
        onSet={onSetParty}
      />
    </section>
  )
}

function CurrencyGroup({
  label,
  credits,
  assets,
  canEdit,
  busy,
  onSet,
}: {
  label: string
  credits: number
  assets: number
  canEdit: boolean
  busy: boolean
  onSet: (updates: { credits?: number; assets?: number }) => void
}) {
  return (
    <div className="rounded-lg border border-gray-400 bg-background-100/40 p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-900">
        {label}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <NumberField
          label="Credits"
          suffix={<IconCurrencyDollar size={14} />}
          value={credits}
          canEdit={canEdit}
          busy={busy}
          onCommit={(v) => onSet({ credits: v })}
        />
        <NumberField
          label="Assets"
          suffix={<IconCash size={14} />}
          value={assets}
          canEdit={canEdit}
          busy={busy}
          onCommit={(v) => onSet({ assets: v })}
        />
      </div>
    </div>
  )
}

function NumberField({
  label,
  suffix,
  value,
  canEdit,
  busy,
  onCommit,
}: {
  label: string
  suffix: ReactNode
  value: number
  canEdit: boolean
  busy: boolean
  onCommit: (v: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  // Re-sync from the server when the input isn't focused — protects an
  // in-progress edit from being clobbered by a concurrent realtime
  // update from another client.
  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  function commit() {
    const parsed = parseInt(draft, 10)
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== value) {
      onCommit(parsed)
    } else {
      setDraft(String(value))
    }
  }

  return (
    <label className="flex flex-col gap-1.5 text-xs text-gray-900">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          size="md"
          min={0}
          value={draft}
          disabled={busy || !canEdit}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            commit()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
            else if (e.key === 'Escape') {
              setDraft(String(value))
              ;(e.currentTarget as HTMLInputElement).blur()
            }
          }}
          className="w-24"
        />
        <span className="text-gray-700">{suffix}</span>
      </div>
    </label>
  )
}

interface InventoryColumnProps {
  title: string
  items: InventoryItem[]
  canEdit: boolean
  busyId: string | null
  onAddCatalog: () => void
  onAddCustom: () => void
  onAddWeapon: () => void
  onAddArmor: () => void
  onUpdateQuantity: (item: InventoryItem, quantity: number) => void
  onUpdateDurability: (item: InventoryItem, durability: number) => void
  onRename: (item: InventoryItem, name: string) => void
  onUpdateLocation: (item: InventoryItem, location: string) => void
  onTransfer: (item: InventoryItem) => void
  transferLabel: string
  onRemove: (item: InventoryItem) => void
  /** Only passed for the character column — toggles `equipped` on a weapon/armor entry. */
  onToggleEquipped?: (item: InventoryItem, equipped: boolean) => void
  onManageMods?: (item: InventoryItem) => void
}

function InventoryColumn({
  title,
  items,
  canEdit,
  busyId,
  onAddCatalog,
  onAddCustom,
  onAddWeapon,
  onAddArmor,
  onUpdateQuantity,
  onUpdateDurability,
  onRename,
  onUpdateLocation,
  onTransfer,
  transferLabel,
  onRemove,
  onToggleEquipped,
  onManageMods,
}: InventoryColumnProps) {
  const groups = useMemo(() => inventoryByLocation(items), [items])

  return (
    <section className="rounded-xl border border-gray-400 bg-background-200">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-400 px-4 py-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onAddCatalog}>
              + Catalog
            </Button>
            <Button variant="secondary" size="sm" onClick={onAddWeapon}>
              + Weapon
            </Button>
            <Button variant="secondary" size="sm" onClick={onAddArmor}>
              + Armor
            </Button>
            <Button variant="secondary" size="sm" onClick={onAddCustom}>
              + Custom
            </Button>
          </div>
        )}
      </header>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-700">No items yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {groups.map((g) => (
            <div key={g.location}>
              <div className="bg-background-100/40 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-700">
                {g.location}
              </div>
              <ul className="divide-y divide-gray-100/60">
                {g.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    canEdit={canEdit}
                    busy={busyId !== null}
                    onQuantityChange={(q) => onUpdateQuantity(item, q)}
                    onDurabilityChange={(d) => onUpdateDurability(item, d)}
                    onRename={(n) => onRename(item, n)}
                    onLocationChange={(loc) => onUpdateLocation(item, loc)}
                    onTransfer={() => onTransfer(item)}
                    transferLabel={transferLabel}
                    onRemove={() => onRemove(item)}
                    onToggleEquipped={
                      onToggleEquipped
                        ? (eq) => onToggleEquipped(item, eq)
                        : undefined
                    }
                    onManageMods={
                      onManageMods ? () => onManageMods(item) : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ItemRow({
  item,
  canEdit,
  busy,
  onQuantityChange,
  onDurabilityChange,
  onRename,
  onLocationChange,
  onTransfer,
  transferLabel,
  onRemove,
  onToggleEquipped,
  onManageMods,
}: {
  item: InventoryItem
  canEdit: boolean
  busy: boolean
  onQuantityChange: (q: number) => void
  onDurabilityChange: (durability: number) => void
  onRename: (name: string) => void
  onLocationChange: (loc: string) => void
  onTransfer: () => void
  transferLabel: string
  onRemove: () => void
  onToggleEquipped?: (equipped: boolean) => void
  onManageMods?: () => void
}) {
  const catalog = item.source === 'catalog' ? lookupItem(item.name) : undefined
  const weapon =
    item.source === 'weapon' && item.weaponRef
      ? lookupWeapon(item.weaponRef)
      : undefined
  const armor =
    item.source === 'armor' && item.armorRef
      ? lookupArmor(item.armorRef)
      : undefined
  const description =
    item.description ??
    catalog?.description ??
    weapon?.specialRules ??
    armor?.specialRules ??
    ''
  const renameAllowed =
    item.source === 'custom' ||
    item.source === 'weapon' ||
    item.source === 'armor'
  const [locationDraft, setLocationDraft] = useState(item.location ?? '')
  const [nameDraft, setNameDraft] = useState(item.name)
  const [expanded, setExpanded] = useState(false)

  // Re-sync drafts from the item when the row is collapsed (no user editing
  // in flight). When expanded, the user owns the draft until blur/commit.
  useEffect(() => {
    if (!expanded) setLocationDraft(item.location ?? '')
  }, [item.location, expanded])
  useEffect(() => {
    if (!expanded) setNameDraft(item.name)
  }, [item.name, expanded])

  function commitLocation() {
    if (locationDraft.trim() !== (item.location ?? '').trim()) {
      onLocationChange(locationDraft)
    }
  }
  function commitName() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== item.name) {
      onRename(trimmed)
    } else {
      setNameDraft(item.name)
    }
  }

  const isEquipment = item.source === 'weapon' || item.source === 'armor'

  return (
    <li>
      {/* Collapsed click-target row — whole row toggles expansion. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="grid cursor-pointer gap-2 px-4 py-2.5 transition hover:bg-gray-100 sm:grid-cols-[1fr_auto]"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-medium text-white">{item.name}</span>
          {catalog && (
            <span className="text-[10px] uppercase tracking-wide text-gray-700">
              {catalog.category}
            </span>
          )}
          {weapon && (
            <span className="text-[10px] uppercase tracking-wide text-gray-700">
              {weapon.type} · {weapon.weapon}
            </span>
          )}
          {armor && (
            <span className="text-[10px] uppercase tracking-wide text-gray-700">
              Armor · {armor.type}
            </span>
          )}
          {item.source === 'custom' && (
            <span className="text-[10px] uppercase tracking-wide text-gray-700">
              Custom
            </span>
          )}
          {item.equipped && (
            <Badge tone="accent" uppercase>
              Equipped
            </Badge>
          )}
        </div>
        {!isEquipment && (
          <span className="text-sm font-semibold text-white">
            ×{item.quantity}
          </span>
        )}
      </div>
      {/* Expanded panel — editing controls + stats + description + actions. */}
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="space-y-3 border-t border-gray-100/60 bg-background-200/40 px-4 py-3"
        >
          {canEdit && (renameAllowed || (isEquipment && onToggleEquipped)) && (
            <div className="flex flex-wrap items-center gap-2">
              {renameAllowed && (
                <Input
                  type="text"
                  size="sm"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      (e.currentTarget as HTMLInputElement).blur()
                    else if (e.key === 'Escape') {
                      setNameDraft(item.name)
                      ;(e.currentTarget as HTMLInputElement).blur()
                    }
                  }}
                  placeholder="Name"
                  className="w-auto font-medium"
                />
              )}
              {isEquipment && onToggleEquipped && (
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => onToggleEquipped(!item.equipped)}
                  disabled={busy}
                >
                  {item.equipped ? 'Unequip' : 'Equip'}
                </Button>
              )}
            </div>
          )}
          {weapon && (
            <WeaponStats
              item={item}
              weapon={weapon}
              canEdit={canEdit}
              busy={busy}
              onManageMods={onManageMods}
            />
          )}
          {armor && (
            <ArmorStats
              item={item}
              armor={armor}
              currentDurability={item.currentDurability}
              canEdit={canEdit}
              busy={busy}
              onDurabilityChange={onDurabilityChange}
              onManageMods={onManageMods}
            />
          )}
          {description && (
            <p className="whitespace-pre-line text-xs text-gray-1000">
              {description}
            </p>
          )}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!isEquipment && (
                <QuantityStepper
                  value={item.quantity}
                  canEdit={canEdit}
                  busy={busy}
                  onCommit={onQuantityChange}
                />
              )}
              <Input
                type="text"
                size="sm"
                value={locationDraft}
                onChange={(e) => setLocationDraft(e.target.value)}
                onBlur={commitLocation}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    (e.currentTarget as HTMLInputElement).blur()
                  else if (e.key === 'Escape') {
                    setLocationDraft(item.location ?? '')
                    ;(e.currentTarget as HTMLInputElement).blur()
                  }
                }}
                placeholder="Location (e.g. backpack)"
                className="min-w-0 flex-1 text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onTransfer}
                disabled={busy}
              >
                Transfer {transferLabel}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={onRemove}
                disabled={busy}
              >
                Remove
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function WeaponStats({
  item,
  weapon,
  canEdit,
  busy,
  onManageMods,
}: {
  item: InventoryItem
  weapon: WeaponData
  canEdit: boolean
  busy: boolean
  onManageMods?: () => void
}) {
  const manufacturer = item.manufacturerRef
    ? lookupManufacturer(item.manufacturerRef)
    : undefined
  const manufacturerKey = isFirearmLike(weapon) ? 'firearms' : 'melee'
  const manufacturerEffect = manufacturer?.effectsByType[manufacturerKey]
  const isFirearm = isFirearmLike(weapon)
  const modLimit = effectiveWeaponModLimit(
    weapon,
    item.manufacturerRef,
    item.mods ?? [],
  )
  const mods = item.mods ?? []
  const consumed = isFirearm ? firearmModsConsumed(mods) : mods.length
  const canShowManage =
    weapon.type !== 'Throwing' && canEdit && onManageMods && modLimit > 0
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-900">
        <span>
          <span className="text-gray-700">DMG:</span>{' '}
          <span className="text-gray-1000">
            {weapon.damage} {weapon.damageType}
          </span>
        </span>
        <span>
          <span className="text-gray-700">AP:</span>{' '}
          <span className="text-gray-1000">{weapon.attackAP}</span>
        </span>
        <span>
          <span className="text-gray-700">Range:</span>{' '}
          <span className="text-gray-1000">
            {weapon.optimalRange}
            {weapon.maxRange != null ? ` / ${weapon.maxRange}` : ''}
          </span>
        </span>
        <span>
          <span className="text-gray-700">Hands:</span>{' '}
          <span className="text-gray-1000">{weapon.hands}</span>
        </span>
        {weapon.magazine != null && (
          <span>
            <span className="text-gray-700">Mag:</span>{' '}
            <span className="text-gray-1000">{weapon.magazine}</span>
            {weapon.reloadAP != null && (
              <span className="text-gray-700">
                {' '}
                · reload {weapon.reloadAP} AP
              </span>
            )}
          </span>
        )}
      </div>
      {(weapon.qualities.length > 0 || weapon.triggerOptions.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {weapon.qualities.map((q) => (
            <QualityBadge key={`q-${q}`} raw={q} variant="quality" />
          ))}
          {weapon.triggerOptions.map((t) => (
            <QualityBadge key={`t-${t}`} raw={t} variant="trigger" />
          ))}
        </div>
      )}
      {manufacturer && manufacturerEffect && (
        <div className="text-[11px]">
          <span className="text-gray-700">Manufacturer:</span>{' '}
          <EffectTooltip text={manufacturerEffect.text}>
            <span className="cursor-help text-gray-1000 underline decoration-dotted underline-offset-2">
              {manufacturer.name}
            </span>
          </EffectTooltip>
        </div>
      )}
      {weapon.type !== 'Throwing' && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-gray-700">
            Mods ({consumed}/{modLimit}):
          </span>
          {mods.length === 0 && (
            <span className="text-gray-700 italic">none</span>
          )}
          {mods.map((name) => {
            const data = isFirearm
              ? lookupFirearmMod(name)
              : lookupMeleeMod(name)
            const text = data?.effects ?? 'Unknown mod.'
            return (
              <EffectTooltip key={name} text={text}>
                <span className="cursor-help text-gray-1000 underline decoration-dotted underline-offset-2">
                  {name}
                </span>
              </EffectTooltip>
            )
          })}
          {canShowManage && (
            <Button
              variant="subtle"
              size="sm"
              onClick={onManageMods}
              disabled={busy}
              className="h-5 px-2 py-0 text-[10px]"
            >
              Manage mods
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ArmorStats({
  item,
  armor,
  currentDurability,
  canEdit,
  busy,
  onDurabilityChange,
  onManageMods,
}: {
  item: InventoryItem
  armor: ArmorData
  currentDurability: number | undefined
  canEdit: boolean
  busy: boolean
  onDurabilityChange: (durability: number) => void
  onManageMods?: () => void
}) {
  const broken =
    armor.durability != null && (currentDurability ?? armor.durability) <= 0
  const manufacturer = item.manufacturerRef
    ? lookupManufacturer(item.manufacturerRef)
    : undefined
  const manufacturerEffect = manufacturer?.effectsByType.armor
  const modLimit = effectiveArmorModLimit(armor, item.manufacturerRef)
  const mods = item.mods ?? []
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-900">
        <span>
          <span className="text-gray-700">Soak:</span>{' '}
          <span className={broken ? 'text-warning-900' : 'text-gray-1000'}>
            {broken ? armor.secondarySoak : armor.primarySoak}
          </span>
          <span className="text-gray-700">
            {' '}
            (pri {armor.primarySoak} / sec {armor.secondarySoak})
          </span>
        </span>
        {armor.durability != null && (
          <span className="inline-flex items-center gap-1">
            <span className="text-gray-700">Durability:</span>
            <DurabilityStepper
              value={currentDurability ?? armor.durability}
              max={armor.durability}
              canEdit={canEdit}
              busy={busy}
              onCommit={onDurabilityChange}
            />
            <span className="text-gray-700">/ {armor.durability}</span>
          </span>
        )}
      </div>
      {armor.qualities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {armor.qualities.map((q) => (
            <QualityBadge key={q} raw={q} variant="quality" />
          ))}
        </div>
      )}
      {manufacturer && manufacturerEffect && (
        <div className="text-[11px]">
          <span className="text-gray-700">Manufacturer:</span>{' '}
          <EffectTooltip text={manufacturerEffect.text}>
            <span className="cursor-help text-gray-1000 underline decoration-dotted underline-offset-2">
              {manufacturer.name}
            </span>
          </EffectTooltip>
          {manufacturer.hegemony && (
            <Badge tone="warning" uppercase className="ml-2">
              Hegemony
            </Badge>
          )}
        </div>
      )}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-gray-700">
            Mods ({mods.length}/{modLimit}):
          </span>
          {mods.length === 0 && (
            <span className="text-gray-700 italic">none</span>
          )}
          {mods.map((name) => {
            const mod = lookupArmorMod(name)
            const text = mod?.effects ?? 'Unknown mod.'
            return (
              <EffectTooltip key={name} text={text}>
                <span className="cursor-help text-gray-1000 underline decoration-dotted underline-offset-2">
                  {name}
                </span>
              </EffectTooltip>
            )
          })}
          {canEdit && onManageMods && modLimit > 0 && (
            <Button
              variant="subtle"
              size="sm"
              onClick={onManageMods}
              disabled={busy}
              className="h-5 px-2 py-0 text-[10px]"
            >
              Manage mods
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function DurabilityStepper({
  value,
  max,
  canEdit,
  busy,
  onCommit,
}: {
  value: number
  max: number
  canEdit: boolean
  busy: boolean
  onCommit: (v: number) => void
}) {
  const broken = value <= 0
  return (
    <InlineStepper
      value={value}
      min={0}
      max={max}
      ariaLabel="durability"
      valueClassName={`text-xs font-semibold ${
        broken ? 'text-warning-900' : 'text-white'
      }`}
      canEdit={canEdit}
      decrementDisabled={busy}
      incrementDisabled={busy}
      onAdjust={(d) => onCommit(Math.max(0, Math.min(max, value + d)))}
    />
  )
}

function QuantityStepper({
  value,
  canEdit,
  busy,
  onCommit,
}: {
  value: number
  canEdit: boolean
  busy: boolean
  onCommit: (v: number) => void
}) {
  return (
    <InlineStepper
      value={value}
      min={1}
      ariaLabel="quantity"
      valueClassName="text-sm font-semibold text-white"
      canEdit={canEdit}
      decrementDisabled={busy}
      incrementDisabled={busy}
      onAdjust={(d) => onCommit(value + d)}
    />
  )
}
