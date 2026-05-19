import { useEffect, useMemo, useState } from 'react'
import {
  weaponsByType,
  type WeaponData,
  type WeaponType,
} from '~/lib/game-logic/weapons'
import { QualityBadge } from './QualityBadge'
import { Button } from '~/components/ui/Button'

interface AddWeaponModalProps {
  busy: boolean
  onAdd: (input: { weaponRef: string; name?: string; location?: string }) => void
  onClose: () => void
}

const TYPE_ORDER: WeaponType[] = [
  'Firearms',
  'Melee',
  'Heavy Weapons',
  'Throwing',
]

export function AddWeaponModal({ busy, onAdd, onClose }: AddWeaponModalProps) {
  const groups = useMemo(() => weaponsByType(), [])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<WeaponType | null>(null)
  const [selected, setSelected] = useState<WeaponData | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    if (selected) setName(selected.illustrativeName)
  }, [selected])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const ordered = [...groups].sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type),
    )
    return ordered
      .filter((g) => !typeFilter || g.type === typeFilter)
      .map((g) => ({
        type: g.type,
        weapons: g.weapons.filter((w) => {
          if (!q) return true
          return (
            w.weapon.toLowerCase().includes(q) ||
            w.illustrativeName.toLowerCase().includes(q) ||
            w.damageType.toLowerCase().includes(q) ||
            w.qualities.some((s) => s.toLowerCase().includes(q)) ||
            w.triggerOptions.some((s) => s.toLowerCase().includes(q))
          )
        }),
      }))
      .filter((g) => g.weapons.length > 0)
  }, [groups, query, typeFilter])

  function handleAdd() {
    if (!selected || busy) return
    onAdd({
      weaponRef: selected.weapon,
      name: name.trim() || selected.illustrativeName,
      location: location.trim() || undefined,
    })
  }

  return (
    <div
      className="modal-backdrop-in fixed backdrop-blur-sm inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col modal-card-in rounded-xl border border-gray-400 bg-background-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-400 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Add weapon</h3>
            <p className="mt-1 text-xs text-gray-900">
              Pick a weapon from the catalog. The illustrative name is just a
              default — rename it however you like.
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

        <div className="space-y-2 border-b border-gray-400 px-5 py-3">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, damage type, quality…"
            className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            <TypePill
              active={typeFilter === null}
              onClick={() => setTypeFilter(null)}
              label="All"
            />
            {TYPE_ORDER.map((t) => (
              <TypePill
                key={t}
                active={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                label={t}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filteredGroups.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-700">
              No weapons match.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((g) => (
                <div key={g.type}>
                  <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-700">
                    {g.type}
                  </h4>
                  <ul className="space-y-1">
                    {g.weapons.map((w) => (
                      <li key={w.weapon}>
                        <button
                          onClick={() => setSelected(w)}
                          className={`w-full rounded-lg border p-2 text-left transition ${
                            selected?.weapon === w.weapon
                              ? 'border-accent-700 bg-accent-700/15'
                              : 'border-gray-400 bg-background-100/40 hover:border-accent-700/50 hover:bg-accent-700/5'
                          }`}
                        >
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-medium text-white">
                              {w.weapon}
                            </span>
                            <span className="text-xs italic text-gray-700">
                              {w.illustrativeName}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-900">
                            <Stat label="DMG">{w.damage} {w.damageType}</Stat>
                            <Stat label="AP">{w.attackAP}</Stat>
                            <Stat label="Range">
                              {w.optimalRange}
                              {w.maxRange != null ? ` / ${w.maxRange}` : ''}
                            </Stat>
                            <Stat label="Hands">{w.hands}</Stat>
                            {w.magazine != null && (
                              <Stat label="Mag">{w.magazine}</Stat>
                            )}
                          </div>
                          {(w.qualities.length > 0 ||
                            w.triggerOptions.length > 0) && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {w.qualities.map((q) => (
                                <QualityBadge
                                  key={`q-${q}`}
                                  raw={q}
                                  variant="quality"
                                />
                              ))}
                              {w.triggerOptions.map((t) => (
                                <QualityBadge
                                  key={`t-${t}`}
                                  raw={t}
                                  variant="trigger"
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-end justify-between gap-3 border-t border-gray-400 px-5 py-3">
          <div className="flex gap-3">
            <label className="block text-xs text-gray-900">
              <span className="block">Name</span>
              <input
                type="text"
                value={name}
                disabled={!selected}
                onChange={(e) => setName(e.target.value)}
                placeholder={selected ? '' : 'Pick a weapon first'}
                className="mt-1 w-48 rounded border border-gray-400 bg-gray-100 px-2 py-1 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none disabled:opacity-50"
              />
            </label>
            <label className="block text-xs text-gray-900">
              <span className="block">Location (optional)</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. holster"
                className="mt-1 w-40 rounded border border-gray-400 bg-gray-100 px-2 py-1 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selected || busy}>
              {busy ? 'Adding…' : 'Add weapon'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function TypePill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
        active
          ? 'border-accent-700 bg-accent-700/20 text-accent-900'
          : 'border-gray-400 bg-gray-100/60 text-gray-900 hover:border-accent-700/50 hover:text-white'
      }`}
    >
      {label}
    </button>
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
