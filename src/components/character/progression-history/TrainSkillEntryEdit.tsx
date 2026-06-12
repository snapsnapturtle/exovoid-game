import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { Character, ProgressionEntry } from '~/lib/types/domain'
import { SKILLS } from '~/lib/game-logic/skills'
import { updateCharacter } from '~/lib/server/characters'
import { updateProgression } from '~/lib/server/progression'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'

interface Props {
  entry: ProgressionEntry
  character: Character
  onCancel: () => void
  onSaved: (row: ProgressionEntry) => void
}

const SKILL_NAME = new Map(SKILLS.map((s) => [s.id, s.name]))

/**
 * Inline edit form for a downtime:train-skill row. Lets the editor swap
 * which skill received the +1 from this training. Saving applies the
 * diff (subtract from the old skill, add to the new one) and persists
 * the new picks payload.
 */
export function TrainSkillEntryEdit({
  entry,
  character,
  onCancel,
  onSaved,
}: Props) {
  const router = useRouter()
  const oldSkillId = (entry.picks as { skillId?: string }).skillId ?? ''
  const [skillId, setSkillId] = useState(oldSkillId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Base = character.skills with the old +1 reversed.
  const baseSkills = useMemo(() => {
    const out = { ...character.skills }
    if (oldSkillId) {
      out[oldSkillId] = Math.max(0, (out[oldSkillId] ?? 0) - 1)
    }
    return out
  }, [character.skills, oldSkillId])

  // Train Skill rule: target skill must be at level ≤ 3 (pre-training).
  const eligible = useMemo(
    () =>
      SKILLS.filter((s) => (baseSkills[s.id] ?? 0) <= 3).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [baseSkills],
  )

  async function save() {
    if (!skillId) return
    setSaving(true)
    setError(null)
    try {
      const newSkills = { ...baseSkills }
      newSkills[skillId] = (newSkills[skillId] ?? 0) + 1
      await updateCharacter({
        data: {
          characterId: character.id,
          updates: { skills: newSkills },
        },
      })
      const updatedRow = await updateProgression({
        data: { id: entry.id, picks: { skillId } as never },
      })
      void router.invalidate()
      onSaved(updatedRow)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save edit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="danger">{error}</Alert>}
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-900">
          Train Skill
        </div>
        <p className="mt-1 text-xs text-gray-1000">
          Pick the skill that received the +1 at level {entry.level}.
        </p>
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-400 bg-background-100 p-2">
        {eligible.map((s) => {
          const isSelected = skillId === s.id
          const baseLvl = baseSkills[s.id] ?? 0
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSkillId(s.id)}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition ${
                  isSelected
                    ? 'bg-accent-700/20 text-white ring-1 ring-accent-700'
                    : 'text-gray-1000 hover:bg-gray-100'
                }`}
              >
                <span>{SKILL_NAME.get(s.id) ?? s.id}</span>
                <span className="tabular-nums text-gray-900">
                  {baseLvl} → {baseLvl + 1}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving || !skillId}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
