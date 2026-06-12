import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from '@tanstack/react-router'
import type { Character } from '~/lib/types/domain'
import { SKILLS } from '~/lib/game-logic/skills'
import { trainableSkillIds } from '~/lib/game-logic/downtime'
import { recordProgression } from '~/lib/server/progression'
import { Button } from '~/components/ui/Button'
import { useDowntimeFooterTarget } from './DowntimeModal'

interface Props {
  character: Character
  onCloseAll: () => void
  onUpdateField: <K extends keyof Character>(
    key: K,
    value: Character[K],
  ) => void
}

export function TrainSkill({ character, onCloseAll, onUpdateField }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const footerEl = useDowntimeFooterTarget()
  const router = useRouter()

  const skillNameById = new Map(SKILLS.map((s) => [s.id, s.name]))
  const eligibleIds = trainableSkillIds(character.skills)
  // Sort by name for stable display, listing only skills with level <= 3.
  const eligible = [...eligibleIds].sort((a, b) =>
    (skillNameById.get(a) ?? a).localeCompare(skillNameById.get(b) ?? b),
  )

  function apply() {
    if (!selected) return
    const currentLevel = character.skills[selected] ?? 0
    onUpdateField('skills', {
      ...character.skills,
      [selected]: currentLevel + 1,
    })
    // No longer touching downtime_uses_used: Train Skill's gate is the
    // lifetime cumulative cap (trainings used ≤ character.level) read
    // off the progression log, not the per-level marker other downtime
    // activities use. See trainSkillUsesRemaining() and the migration
    // note in DowntimeModal.tsx.
    //
    // Fire-and-forget the progression entry. The skill bump is the player's
    // intent — we won't surface a hard error if the audit-log write fails,
    // just log it. #42's history view reads these rows.
    void recordProgression({
      data: {
        characterId: character.id,
        level: character.level,
        source: 'downtime:train-skill',
        picks: { skillId: selected },
      },
    }).catch((e) => {
      console.error('Failed to record training progression', e)
    })
    // Mark route loaders stale so navigating away and back picks up the
    // new skill level instead of returning the cached pre-training snapshot.
    void router.invalidate()
    onCloseAll()
  }

  if (eligible.length === 0) {
    return (
      <p className="text-sm text-gray-1000">
        You don't have any skills at level 3 or below — every skill is past the
        training cap.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-1000">
        Pick a skill at level 3 or below to train. This consumes your Train
        Skill use for level {character.level}.
      </p>
      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-400 bg-background-100 p-2">
        {eligible.map((id) => {
          const level = character.skills[id] ?? 0
          const isSelected = selected === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setSelected(id)}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition ${
                  isSelected
                    ? 'bg-accent-700/20 text-white ring-1 ring-accent-700'
                    : 'text-gray-1000 hover:bg-gray-100'
                }`}
              >
                <span>{skillNameById.get(id) ?? id}</span>
                <span className="tabular-nums text-gray-900">
                  {level} → {level + 1}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {footerEl &&
        createPortal(
          <Button onClick={apply} disabled={!selected}>
            Confirm training
          </Button>,
          footerEl,
        )}
    </div>
  )
}
