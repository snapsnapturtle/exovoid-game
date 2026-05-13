import { useEffect, useMemo, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import type {
  Character,
  GameState,
  InventoryItem,
} from '~/lib/types/database'
import { inventoryByLocation, lookupItem } from '~/lib/game-logic/items'
import {
  addInventoryItem,
  removeInventoryItem,
  setCurrency,
  transferInventoryItem,
  updateInventoryItem,
} from '~/lib/server/inventory'
import { AddCatalogItemModal } from './AddCatalogItemModal'
import { AddCustomItemModal } from './AddCustomItemModal'

type Owner =
  | { type: 'character'; characterId: string }
  | { type: 'game'; gameId: string }

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
    | null
  >(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<'mine' | 'party'>('mine')

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
        <Link
          to="/games/$gameId/characters/$characterId"
          params={{ gameId: character.game_id, characterId: character.id }}
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← {character.name || 'Character'}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-white">Inventory</h1>
      </header>

      {error && (
        <div className="rounded-lg border border-danger-500/60 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </div>
      )}

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

      <div className="flex gap-1 rounded-xl border border-void-600 bg-void-800 p-1">
        <TabButton
          active={tab === 'mine'}
          onClick={() => setTab('mine')}
          label="Mine"
          count={character.inventory.length}
        />
        <TabButton
          active={tab === 'party'}
          onClick={() => setTab('party')}
          label="Party"
          count={gameState.inventory.length}
        />
      </div>

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
        />
      ) : (
        <InventoryColumn
          title="Party inventory"
          items={gameState.inventory}
          canEdit={canEdit}
          busyId={busyId}
          onAddCatalog={() => setAddModal({ kind: 'catalog', owner: gameOwner })}
          onAddCustom={() => setAddModal({ kind: 'custom', owner: gameOwner })}
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
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-accent-500/20 text-accent-200'
          : 'text-gray-400 hover:bg-void-700 hover:text-white'
      }`}
    >
      {label}
      <span
        className={`ml-2 text-xs ${active ? 'text-accent-300/80' : 'text-gray-500'}`}
      >
        {count}
      </span>
    </button>
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
    <section className="grid gap-3 rounded-xl border border-void-600 bg-void-800 p-4 sm:grid-cols-2">
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
    <div className="rounded-lg border border-void-700 bg-void-900/40 p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <NumberField
          label="Credits"
          suffix="¢"
          value={credits}
          canEdit={canEdit}
          busy={busy}
          onCommit={(v) => onSet({ credits: v })}
        />
        <NumberField
          label="Assets"
          suffix="⬡"
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
  suffix: string
  value: number
  canEdit: boolean
  busy: boolean
  onCommit: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  function commit() {
    const parsed = parseInt(draft, 10)
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== value) {
      onCommit(parsed)
    } else {
      setDraft(String(value))
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <label className="flex items-baseline gap-1 text-xs text-gray-400">
        <span>{label}</span>
        <input
          autoFocus
          type="number"
          min={0}
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') {
              setDraft(String(value))
              setEditing(false)
            }
          }}
          className="w-20 rounded border border-accent-500 bg-void-700 px-1.5 py-0.5 text-sm text-white focus:outline-none"
        />
        <span className="text-gray-500">{suffix}</span>
      </label>
    )
  }

  return (
    <button
      type="button"
      onClick={() => canEdit && setEditing(true)}
      disabled={!canEdit}
      className="flex items-baseline gap-1 text-left disabled:cursor-default"
    >
      <span className="text-xs text-gray-400">{label}</span>
      <span className="font-mono text-base font-semibold text-white">
        {value.toLocaleString()}
      </span>
      <span className="text-xs text-gray-500">{suffix}</span>
    </button>
  )
}

interface InventoryColumnProps {
  title: string
  items: InventoryItem[]
  canEdit: boolean
  busyId: string | null
  onAddCatalog: () => void
  onAddCustom: () => void
  onUpdateQuantity: (item: InventoryItem, quantity: number) => void
  onUpdateLocation: (item: InventoryItem, location: string) => void
  onTransfer: (item: InventoryItem) => void
  transferLabel: string
  onRemove: (item: InventoryItem) => void
}

function InventoryColumn({
  title,
  items,
  canEdit,
  busyId,
  onAddCatalog,
  onAddCustom,
  onUpdateQuantity,
  onUpdateLocation,
  onTransfer,
  transferLabel,
  onRemove,
}: InventoryColumnProps) {
  const groups = useMemo(() => inventoryByLocation(items), [items])

  return (
    <section className="rounded-xl border border-void-600 bg-void-800">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-void-700 px-4 py-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={onAddCatalog}
              className="rounded-lg border border-accent-500/60 bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-200 transition hover:bg-accent-500/25"
            >
              + Catalog
            </button>
            <button
              onClick={onAddCustom}
              className="rounded-lg border border-void-600 bg-void-700 px-2.5 py-1 text-xs text-gray-300 transition hover:border-accent-500 hover:text-white"
            >
              + Custom
            </button>
          </div>
        )}
      </header>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No items yet.
        </p>
      ) : (
        <div className="divide-y divide-void-700">
          {groups.map((g) => (
            <div key={g.location}>
              <div className="bg-void-900/40 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {g.location}
              </div>
              <ul className="divide-y divide-void-700/60">
                {g.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    canEdit={canEdit}
                    busy={busyId !== null}
                    onQuantityChange={(q) => onUpdateQuantity(item, q)}
                    onLocationChange={(loc) => onUpdateLocation(item, loc)}
                    onTransfer={() => onTransfer(item)}
                    transferLabel={transferLabel}
                    onRemove={() => onRemove(item)}
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
  onLocationChange,
  onTransfer,
  transferLabel,
  onRemove,
}: {
  item: InventoryItem
  canEdit: boolean
  busy: boolean
  onQuantityChange: (q: number) => void
  onLocationChange: (loc: string) => void
  onTransfer: () => void
  transferLabel: string
  onRemove: () => void
}) {
  const catalog = item.source === 'catalog' ? lookupItem(item.name) : undefined
  const description = item.description ?? catalog?.description ?? ''
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationDraft, setLocationDraft] = useState(item.location ?? '')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!editingLocation) setLocationDraft(item.location ?? '')
  }, [item.location, editingLocation])

  function commitLocation() {
    setEditingLocation(false)
    if (locationDraft.trim() !== (item.location ?? '').trim()) {
      onLocationChange(locationDraft)
    }
  }

  return (
    <li className="grid gap-2 px-4 py-2.5 sm:grid-cols-[1fr_auto]">
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-medium text-white">{item.name}</span>
          {catalog && (
            <span className="text-[10px] uppercase tracking-wide text-gray-500">
              {catalog.category}
            </span>
          )}
          {item.source === 'custom' && (
            <span className="rounded border border-void-600 bg-void-700 px-1 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
              Custom
            </span>
          )}
        </div>
        {description && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="block w-full text-left"
            title={expanded ? 'Click to collapse' : 'Click to expand'}
          >
            <span
              className={`text-xs text-gray-400 transition hover:text-gray-300 ${
                expanded ? 'block whitespace-pre-line' : 'line-clamp-2'
              }`}
            >
              {description}
            </span>
          </button>
        )}
        {canEdit &&
          (editingLocation ? (
            <input
              autoFocus
              type="text"
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value)}
              onBlur={commitLocation}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLocation()
                else if (e.key === 'Escape') setEditingLocation(false)
              }}
              placeholder="Location (e.g. backpack)"
              className="rounded border border-accent-500 bg-void-700 px-1.5 py-0.5 text-xs text-white focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingLocation(true)}
              className="text-[11px] text-gray-500 transition hover:text-accent-300"
            >
              {item.location ? `In ${item.location} · change` : '+ Set location'}
            </button>
          ))}
      </div>
      <div className="flex items-center gap-1.5 sm:flex-col sm:items-end sm:gap-1">
        <QuantityStepper
          value={item.quantity}
          canEdit={canEdit}
          busy={busy}
          onCommit={onQuantityChange}
        />
        {canEdit && (
          <div className="flex gap-1">
            <button
              onClick={onTransfer}
              disabled={busy}
              className="rounded border border-void-600 bg-void-700 px-1.5 py-0.5 text-[11px] text-gray-300 transition hover:border-accent-500 hover:text-white disabled:opacity-40"
              title="Transfer the whole stack"
            >
              {transferLabel}
            </button>
            <button
              onClick={onRemove}
              disabled={busy}
              className="rounded border border-void-600 bg-void-700 px-1.5 py-0.5 text-[11px] text-gray-400 transition hover:border-danger-500 hover:text-danger-300 disabled:opacity-40"
              title="Remove"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </li>
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
    <div className="inline-flex items-center gap-1">
      {canEdit && (
        <button
          onClick={() => value > 1 && onCommit(value - 1)}
          disabled={busy || value <= 1}
          className="h-6 w-6 rounded border border-void-600 bg-void-700 text-xs text-gray-300 transition hover:border-accent-500 hover:text-white disabled:opacity-30"
          aria-label="Decrease quantity"
        >
          −
        </button>
      )}
      <span className="min-w-[2.25rem] text-center font-mono text-sm font-semibold text-white">
        ×{value}
      </span>
      {canEdit && (
        <button
          onClick={() => onCommit(value + 1)}
          disabled={busy}
          className="h-6 w-6 rounded border border-void-600 bg-void-700 text-xs text-gray-300 transition hover:border-accent-500 hover:text-white disabled:opacity-30"
          aria-label="Increase quantity"
        >
          +
        </button>
      )}
    </div>
  )
}
