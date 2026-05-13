import { useMemo, useState } from 'react'
import talentsData from '~/data/talents.json'

interface TalentMeta {
  name: string
  description: string
}
const ALL_TALENTS = talentsData as TalentMeta[]

interface ManualAddTalentProps {
  ownedNames: Set<string>
  busy: boolean
  onAdd: (talentName: string) => void
  onClose: () => void
}

export function ManualAddTalent({
  ownedNames,
  busy,
  onAdd,
  onClose,
}: ManualAddTalentProps) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_TALENTS.filter((t) => {
      if (ownedNames.has(t.name)) return false
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      )
    }).slice(0, 60)
  }, [query, ownedNames])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-void-600 bg-void-800 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Add talent manually
            </h3>
            <p className="text-xs text-gray-400">
              Adds any talent outside the normal career tree (e.g. background
              grants). Does not consume a talent point.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search talents..."
          className="w-full rounded-lg border border-void-600 bg-void-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
        />

        <div className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No talents match.
            </p>
          ) : (
            matches.map((t) => (
              <button
                key={t.name}
                disabled={busy}
                onClick={() => onAdd(t.name)}
                className="w-full rounded border border-void-600 bg-void-700/40 p-2 text-left transition hover:border-accent-500 hover:bg-accent-500/10 disabled:opacity-50"
              >
                <div className="text-sm font-medium text-white">{t.name}</div>
                <div className="line-clamp-2 text-xs text-gray-400">
                  {t.description}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
