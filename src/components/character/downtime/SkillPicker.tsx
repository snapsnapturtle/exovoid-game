import { useMemo, useState } from 'react'
import { SKILLS, type SkillDefinition } from '~/lib/game-logic/skills'
import { Input } from '~/components/ui/Input'

interface SkillPickerProps {
  /** Skill ids to surface. Defaults to all 24 skills. */
  skillIds?: readonly string[]
  /** Per-character levels for the chosen skills (`character.skills`). */
  skills: Record<string, number>
  /** Show the filter input. Defaults to true when more than 5 skills are listed. */
  searchable?: boolean
  /** Optional one-line hint shown above the list. */
  hint?: string
  onSelect: (skillId: string) => void
}

export function SkillPicker({
  skillIds,
  skills,
  searchable,
  hint,
  onSelect,
}: SkillPickerProps) {
  const [filter, setFilter] = useState('')

  const list: SkillDefinition[] = useMemo(() => {
    const base = skillIds
      ? skillIds
          .map((id) => SKILLS.find((s) => s.id === id))
          .filter((s): s is SkillDefinition => Boolean(s))
      : SKILLS
    const sorted = [...base].sort((a, b) => a.name.localeCompare(b.name))
    const q = filter.trim().toLowerCase()
    return q ? sorted.filter((s) => s.name.toLowerCase().includes(q)) : sorted
  }, [skillIds, filter])

  const showFilter = searchable ?? list.length > 5

  return (
    <div className="space-y-3">
      {hint && <p className="text-sm text-gray-1000">{hint}</p>}
      {showFilter && (
        <Input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter skills..."
          className="w-full"
        />
      )}
      <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-gray-400 bg-background-100 p-2">
        {list.map((s) => {
          const level = skills[s.id] ?? 0
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-gray-1000 transition hover:bg-gray-100 hover:text-white"
              >
                <span>{s.name}</span>
                <span className="tabular-nums text-gray-700">
                  Level {level}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
