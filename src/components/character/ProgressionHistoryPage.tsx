import { useMemo, useState } from 'react'
import type { Character, ProgressionEntry } from '~/lib/types/database'
import { SKILLS } from '~/lib/game-logic/skills'
import { isLevelUpPicks, type LevelUpPicks } from '~/lib/game-logic/level-up'
import { useCharacterProgression } from '~/lib/hooks/useCharacterProgression'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { LevelUpEntryEdit } from './progression-history/LevelUpEntryEdit'
import { TrainSkillEntryEdit } from './progression-history/TrainSkillEntryEdit'

const SKILL_NAME = new Map(SKILLS.map((s) => [s.id, s.name]))

interface Props {
  character: Character
  canEdit: boolean
  /** Loader-supplied progression snapshot — bypasses the hook's
   * on-mount fetch so the page's HTML is meaningful on first paint
   * instead of flashing an empty state. */
  initialProgression: ProgressionEntry[]
}

/**
 * Per-character progression log. Renders every committed pick grouped by
 * level (descending) — level-up picks alongside any Train Skill bumps
 * recorded at the same level. The owner / controller / GM can edit a
 * row inline (RLS-gated); saves apply the diff via updateCharacter and
 * persist the new picks via updateProgression.
 */
export function ProgressionHistoryPage({
  character,
  canEdit,
  initialProgression,
}: Props) {
  const { rows, upsertLocal } = useCharacterProgression(
    character.id,
    initialProgression,
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<number, ProgressionEntry[]>()
    for (const r of rows) {
      const list = map.get(r.level) ?? []
      list.push(r)
      map.set(r.level, list)
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [rows])

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Progression</h1>
      </header>

      {grouped.length === 0 && (
        <Alert variant="info">
          No progression entries yet. Train a skill or level up to start
          tracking changes here.
        </Alert>
      )}

      {grouped.map(([level, entries]) => (
        <section
          key={level}
          className="rounded-xl border border-gray-400 bg-background-200"
        >
          <header className="border-b border-gray-400 px-4 py-2">
            <div className="text-xs uppercase tracking-wide text-gray-900">
              Level
            </div>
            <div className="text-lg font-semibold text-white">{level}</div>
          </header>
          <ul className="divide-y divide-gray-400">
            {entries.map((entry) => (
              <li key={entry.id} className="px-4 py-3">
                {editingId === entry.id ? (
                  <EditRow
                    entry={entry}
                    character={character}
                    onCancel={() => setEditingId(null)}
                    onSaved={(updated) => {
                      upsertLocal(updated)
                      setEditingId(null)
                    }}
                  />
                ) : (
                  <ViewRow
                    entry={entry}
                    canEdit={canEdit}
                    onEdit={() => setEditingId(entry.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function ViewRow({
  entry,
  canEdit,
  onEdit,
}: {
  entry: ProgressionEntry
  canEdit: boolean
  onEdit: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <EntrySummary entry={entry} />
      </div>
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  )
}

function EditRow({
  entry,
  character,
  onCancel,
  onSaved,
}: {
  entry: ProgressionEntry
  character: Character
  onCancel: () => void
  onSaved: (row: ProgressionEntry) => void
}) {
  if (entry.source === 'level-up' && isLevelUpPicks(entry.picks)) {
    return (
      <LevelUpEntryEdit
        entry={entry}
        character={character}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    )
  }
  if (entry.source === 'downtime:train-skill') {
    return (
      <TrainSkillEntryEdit
        entry={entry}
        character={character}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    )
  }
  return (
    <Alert variant="warning">
      This entry's source (<code>{entry.source}</code>) doesn't have an editor
      yet.
      <div className="mt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Close
        </Button>
      </div>
    </Alert>
  )
}

function EntrySummary({ entry }: { entry: ProgressionEntry }) {
  if (entry.source === 'level-up' && isLevelUpPicks(entry.picks)) {
    const picks = entry.picks as LevelUpPicks
    const skillBumps = Object.entries(picks.skills).filter(([, n]) => n > 0)
    return (
      <div>
        <div className="text-xs uppercase tracking-wide text-accent-900">
          Level-up
        </div>
        <ul className="mt-1 space-y-0.5 text-sm text-gray-1000">
          {skillBumps.map(([id, n]) => (
            <li key={id}>
              +{n} {SKILL_NAME.get(id) ?? id}
            </li>
          ))}
          {skillBumps.length === 0 && (
            <li className="text-gray-700">No skill bumps</li>
          )}
          <li>
            {picks.talent ? (
              <>
                Talent: <span className="text-white">{picks.talent.name}</span>{' '}
                <span className="text-[10px] uppercase tracking-wide text-gray-700">
                  {picks.talent.career} · T{picks.talent.tier}
                </span>
              </>
            ) : (
              <span className="text-gray-700">Talent: banked</span>
            )}
          </li>
        </ul>
      </div>
    )
  }
  if (entry.source === 'downtime:train-skill') {
    const picks = entry.picks as { skillId?: string }
    return (
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-900">
          Train Skill
        </div>
        <p className="mt-1 text-sm text-gray-1000">
          +1 {SKILL_NAME.get(picks.skillId ?? '') ?? picks.skillId ?? '—'}
        </p>
      </div>
    )
  }
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-900">
        {entry.source}
      </div>
      <pre className="mt-1 overflow-x-auto text-xs text-gray-1000">
        {JSON.stringify(entry.picks, null, 2)}
      </pre>
    </div>
  )
}
