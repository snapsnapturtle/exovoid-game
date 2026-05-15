import { useEffect, useMemo, useState } from 'react'
import { allArmors, type ArmorData } from '~/lib/game-logic/armors'
import { QualityBadge } from './QualityBadge'
import { Button } from '~/components/ui/Button'

interface AddArmorModalProps {
  busy: boolean
  onAdd: (input: { armorRef: string; name?: string; location?: string }) => void
  onClose: () => void
}

export function AddArmorModal({ busy, onAdd, onClose }: AddArmorModalProps) {
  const armors = useMemo(() => allArmors(), [])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ArmorData | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    if (selected) setName(selected.illustrativeName)
  }, [selected])

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

  function handleAdd() {
    if (!selected || busy) return
    onAdd({
      armorRef: selected.type,
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
        className="flex max-h-[90vh] w-full max-w-2xl flex-col modal-card-in rounded-xl border border-void-600 bg-void-800"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-void-600 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Add armor</h3>
            <p className="mt-1 text-xs text-gray-400">
              Pick an armor from the catalog. The illustrative name is just a
              default — rename it however you like.
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

        <div className="border-b border-void-600 px-5 py-3">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by type, name, quality…"
            className="w-full rounded-lg border border-void-600 bg-void-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No armor matches.
            </p>
          ) : (
            <ul className="space-y-1">
              {matches.map((a) => (
                <li key={a.type}>
                  <button
                    onClick={() => setSelected(a)}
                    className={`w-full rounded-lg border p-2 text-left transition ${
                      selected?.type === a.type
                        ? 'border-accent-500 bg-accent-500/15'
                        : 'border-void-600 bg-void-900/40 hover:border-accent-500/50 hover:bg-accent-500/5'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-white">{a.type}</span>
                      <span className="text-xs italic text-gray-500">
                        {a.illustrativeName}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
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
          )}
        </div>

        <footer className="flex flex-wrap items-end justify-between gap-3 border-t border-void-600 px-5 py-3">
          <div className="flex gap-3">
            <label className="block text-xs text-gray-400">
              <span className="block">Name</span>
              <input
                type="text"
                value={name}
                disabled={!selected}
                onChange={(e) => setName(e.target.value)}
                placeholder={selected ? '' : 'Pick an armor first'}
                className="mt-1 w-48 rounded border border-void-600 bg-void-700 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none disabled:opacity-50"
              />
            </label>
            <label className="block text-xs text-gray-400">
              <span className="block">Location (optional)</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. locker"
                className="mt-1 w-40 rounded border border-void-600 bg-void-700 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selected || busy}>
              {busy ? 'Adding…' : 'Add armor'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span>
      <span className="text-gray-500">{label}:</span>{' '}
      <span className="text-gray-300">{children}</span>
    </span>
  )
}
