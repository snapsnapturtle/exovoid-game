import { useMemo, useState } from 'react'
import talentsData from '~/data/talents.json'
import { Modal } from '~/components/ui/Modal'
import { Input } from '~/components/ui/Input'

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
    <Modal
      onClose={onClose}
      title="Add talent manually"
      subtitle="Adds any talent outside the normal career tree (e.g. background grants). Does not consume a talent point."
      size="md"
      stickyHeader={
        <Input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search talents..."
          className="w-full"
        />
      }
    >
      {matches.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-700">
          No talents match.
        </p>
      ) : (
        <div className="space-y-1">
          {matches.map((t) => (
            <button
              key={t.name}
              disabled={busy}
              onClick={() => onAdd(t.name)}
              className="w-full rounded border border-gray-400 bg-gray-100/40 p-2 text-left transition not-disabled:hover:border-accent-700 not-disabled:hover:bg-accent-700/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="text-sm font-medium text-white">{t.name}</div>
              <div className="line-clamp-2 text-xs text-gray-900">
                {t.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
