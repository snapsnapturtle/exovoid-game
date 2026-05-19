import { useEffect, useMemo, useState } from 'react'
import { allArmors, type ArmorData } from '~/lib/game-logic/armors'
import {
  manufacturersFor,
  resolveManufacturedCost,
  type ManufacturerData,
} from '~/lib/game-logic/manufacturers'
import { QualityBadge } from './QualityBadge'
import { Button } from '~/components/ui/Button'

interface AddArmorModalProps {
  busy: boolean
  onAdd: (input: {
    armorRef: string
    manufacturerRef: string
    name?: string
    location?: string
  }) => void
  onClose: () => void
}

type Step = 'armor' | 'manufacturer'

export function AddArmorModal({ busy, onAdd, onClose }: AddArmorModalProps) {
  const armors = useMemo(() => allArmors(), [])
  const manufacturers = useMemo(() => manufacturersFor('armor'), [])
  const [query, setQuery] = useState('')
  const [armor, setArmor] = useState<ArmorData | null>(null)
  const [manufacturer, setManufacturer] = useState<ManufacturerData | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [step, setStep] = useState<Step>('armor')

  useEffect(() => {
    if (armor) setName(armor.illustrativeName)
  }, [armor])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return armors
    return armors.filter(
      (a) =>
        a.type.toLowerCase().includes(q) ||
        a.illustrativeName.toLowerCase().includes(q) ||
        a.qualities.some((s) => s.toLowerCase().includes(q)),
    )
  }, [armors, query])

  function selectArmor(a: ArmorData) {
    setArmor(a)
    setStep('manufacturer')
  }

  function handleAdd() {
    if (!armor || !manufacturer || busy) return
    onAdd({
      armorRef: armor.type,
      manufacturerRef: manufacturer.name,
      name: name.trim() || armor.illustrativeName,
      location: location.trim() || undefined,
    })
  }

  return (
    <div
      className="modal-backdrop-in fixed backdrop-blur-sm inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col modal-card-in rounded-xl border border-gray-400 bg-background-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-400 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {step === 'armor' ? 'Add armor — pick model' : 'Add armor — pick manufacturer'}
            </h3>
            <p className="mt-1 text-xs text-gray-900">
              {step === 'armor'
                ? 'Pick an armor from the catalog. The illustrative name is just a default — rename it however you like.'
                : `Manufacturer for ${armor?.type}. Their treatment changes cost, mod slots, rarity and grants a passive effect.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-900 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {step === 'armor' && (
          <div className="border-b border-gray-400 px-5 py-3">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by type, name, quality…"
              className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {step === 'armor' ? (
            matches.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-700">
                No armor matches.
              </p>
            ) : (
              <ul className="space-y-1">
                {matches.map((a) => (
                  <li key={a.type}>
                    <button
                      onClick={() => selectArmor(a)}
                      className={`w-full rounded-lg border p-2 text-left transition ${
                        armor?.type === a.type
                          ? 'border-accent-700 bg-accent-700/15'
                          : 'border-gray-400 bg-background-100/40 hover:border-accent-700/50 hover:bg-accent-700/5'
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium text-white">{a.type}</span>
                        <span className="text-xs italic text-gray-700">
                          {a.illustrativeName}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-900">
                        <Stat label="Soak">
                          {a.primarySoak} / {a.secondarySoak}
                        </Stat>
                        {a.durability != null && (
                          <Stat label="Durability">{a.durability}</Stat>
                        )}
                        {a.cost != null && (
                          <Stat label="Cost">{a.cost.toLocaleString()} ¢</Stat>
                        )}
                        {a.rarity != null && <Stat label="Rarity">{a.rarity}</Stat>}
                        <Stat label="Mod slots">{a.modLimit}</Stat>
                      </div>
                      {a.qualities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.qualities.map((q) => (
                            <QualityBadge key={q} raw={q} variant="quality" />
                          ))}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ManufacturerList
              manufacturers={manufacturers}
              armor={armor!}
              selected={manufacturer}
              onSelect={setManufacturer}
            />
          )}
        </div>

        <footer className="flex flex-wrap items-end justify-between gap-3 border-t border-gray-400 px-5 py-3">
          <div className="flex gap-3">
            <label className="block text-xs text-gray-900">
              <span className="block">Name</span>
              <input
                type="text"
                value={name}
                disabled={!armor}
                onChange={(e) => setName(e.target.value)}
                placeholder={armor ? '' : 'Pick an armor first'}
                className="mt-1 w-48 rounded border border-gray-400 bg-gray-100 px-2 py-1 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none disabled:opacity-50"
              />
            </label>
            <label className="block text-xs text-gray-900">
              <span className="block">Location (optional)</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. locker"
                className="mt-1 w-40 rounded border border-gray-400 bg-gray-100 px-2 py-1 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
              />
            </label>
          </div>
          <div className="flex gap-2">
            {step === 'manufacturer' && (
              <Button
                variant="ghost"
                onClick={() => setStep('armor')}
                disabled={busy}
              >
                Back
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!armor || !manufacturer || busy}
            >
              {busy ? 'Adding…' : 'Add armor'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function ManufacturerList({
  manufacturers,
  armor,
  selected,
  onSelect,
}: {
  manufacturers: ManufacturerData[]
  armor: ArmorData
  selected: ManufacturerData | null
  onSelect: (m: ManufacturerData) => void
}) {
  return (
    <ul className="space-y-1">
      {manufacturers.map((m) => {
        const effect = m.effectsByType.armor
        if (!effect) return null
        const effectiveCost = resolveManufacturedCost(armor.cost, m, 'armor')
        const slotAdjust = effect.modSlotAdjust
        const rarityAdjust = effect.rarityAdjust
        const isSelected = selected?.name === m.name
        return (
          <li key={m.name}>
            <button
              onClick={() => onSelect(m)}
              className={`w-full rounded-lg border p-2 text-left transition ${
                isSelected
                  ? 'border-accent-700 bg-accent-700/15'
                  : 'border-gray-400 bg-background-100/40 hover:border-accent-700/50 hover:bg-accent-700/5'
              }`}
            >
              {m.hegemony && (
                <p className="mb-2 rounded border border-warning-400 bg-warning-100 px-2 py-1 text-[11px] text-warning-900">
                  Hegemony manufacturer — not typically available to player
                  characters.
                </p>
              )}
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-white">{m.name}</span>
                {m.description && (
                  <span className="text-xs italic text-gray-700">
                    {m.description}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-900">
                {effectiveCost != null && (
                  <Stat label="Cost">
                    {effectiveCost.toLocaleString()} ¢
                  </Stat>
                )}
                {armor.rarity != null && (
                  <Stat label="Rarity">
                    {Math.max(0, armor.rarity + rarityAdjust)}
                    {rarityAdjust !== 0 && (
                      <span className="text-gray-700">
                        {' '}
                        ({rarityAdjust > 0 ? '+' : ''}
                        {rarityAdjust})
                      </span>
                    )}
                  </Stat>
                )}
                <Stat label="Mod slots">
                  {Math.max(0, armor.modLimit + slotAdjust)}
                  {slotAdjust !== 0 && (
                    <span className="text-gray-700">
                      {' '}
                      ({slotAdjust > 0 ? '+' : ''}
                      {slotAdjust})
                    </span>
                  )}
                </Stat>
              </div>
              <p className="mt-2 whitespace-pre-line text-xs text-gray-1000">
                {effect.text}
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span>
      <span className="text-gray-700">{label}:</span>{' '}
      <span className="text-gray-1000">{children}</span>
    </span>
  )
}
