import { useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { createNpc } from '~/lib/server/npcs'
import {
  ATTRIBUTE_DEFINITIONS,
  MAX_ATTRIBUTE_LEVEL,
} from '~/lib/game-logic/attributes'
import { SKILLS, MAX_SKILL_LEVEL } from '~/lib/game-logic/skills'
import type { CharacterAttributes } from '~/lib/types/database'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { InlineStepper } from '~/components/ui/InlineStepper'

interface NpcCreationFormProps {
  gameId: string
  isGm: boolean
  currentUserId: string
  /** Game members. The GM is folded into the "GM" sentinel option and so
   * is hidden from the controller list. */
  members: {
    user_id: string
    role: string
    profiles: { display_name: string } | null
  }[]
}

const PRESETS = {
  trainee: { attr: 4 },
  experienced: { attr: 5 },
  veteran: { attr: 6 },
} as const

type PresetKey = keyof typeof PRESETS

const DEFAULT_ATTRS: CharacterAttributes = {
  con: 4,
  str: 4,
  agi: 4,
  int: 4,
  edu: 4,
  per: 4,
  coo: 4,
}

export function NpcCreationForm({
  gameId,
  isGm,
  currentUserId,
  members,
}: NpcCreationFormProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const [name, setName] = useState('')
  const [isMinion, setIsMinion] = useState(false)
  const [visibleToPlayers, setVisibleToPlayers] = useState(!isGm)
  const [controllerUserId, setControllerUserId] = useState<string | null>(
    isGm ? null : currentUserId,
  )
  const [attributes, setAttributes] =
    useState<CharacterAttributes>(DEFAULT_ATTRS)
  const [skills, setSkills] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyPreset(key: PresetKey) {
    const p = PRESETS[key]
    setAttributes({
      con: p.attr,
      str: p.attr,
      agi: p.attr,
      int: p.attr,
      edu: p.attr,
      per: p.attr,
      coo: p.attr,
    })
    setSkills({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const npc = await createNpc({
        data: {
          gameId,
          name: name.trim(),
          is_minion: isMinion,
          visible_to_players: visibleToPlayers,
          controller_user_id: controllerUserId,
          attributes,
          skills,
        },
      })
      await router.invalidate()
      navigate({
        to: '/games/$gameId/npcs/$npcId',
        params: { gameId, npcId: npc.id },
      })
    } catch (e) {
      setSubmitting(false)
      setError(e instanceof Error ? e.message : 'Failed to create NPC')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <h2 className="text-xl font-semibold text-white">New NPC</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Identity ------------------------------------------------- */}
      <section className="rounded-xl border border-gray-400 bg-background-200 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">
          Identity
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-gray-900">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Vex the Quick"
              className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-gray-900">Controller</span>
            <select
              value={controllerUserId ?? ''}
              onChange={(e) => setControllerUserId(e.target.value || null)}
              className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white focus:border-accent-900 focus:outline-none"
            >
              {(() => {
                const gm = members.find((m) => m.role === 'gm')
                const gmName = gm?.profiles?.display_name || 'GM'
                return <option value="">{gmName} (GM)</option>
              })()}
              {members
                .filter((m) => m.role !== 'gm')
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.display_name || 'Unknown'}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-1000">
            <input
              type="checkbox"
              checked={isMinion}
              onChange={(e) => setIsMinion(e.target.checked)}
              className="h-4 w-4 rounded border-gray-400 bg-gray-100 text-accent-700 focus:ring-accent-900"
            />
            Minion
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-1000">
            <input
              type="checkbox"
              checked={visibleToPlayers}
              onChange={(e) => setVisibleToPlayers(e.target.checked)}
              className="h-4 w-4 rounded border-gray-400 bg-gray-100 text-accent-700 focus:ring-accent-900"
            />
            Visible to players
          </label>
        </div>
      </section>

      {/* Presets -------------------------------------------------- */}
      <section className="rounded-xl border border-gray-400 bg-background-200 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">
          Quick preset
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => applyPreset('trainee')}
          >
            Trainee
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => applyPreset('experienced')}
          >
            Experienced
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => applyPreset('veteran')}
          >
            Veteran
          </Button>
        </div>
      </section>

      {/* Attributes ----------------------------------------------- */}
      <section className="rounded-xl border border-gray-400 bg-background-200 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">
          Attributes
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {ATTRIBUTE_DEFINITIONS.map((a) => (
            <div
              key={a.id}
              className="flex flex-col items-center rounded-lg border border-gray-400 bg-gray-100 px-1 py-2"
              title={a.description}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-900">
                {a.abbr}
              </span>
              <span className="my-1 text-2xl font-bold leading-none text-white">
                {attributes[a.id]}
              </span>
              <InlineStepper
                ariaLabel={a.name}
                value={attributes[a.id]}
                min={0}
                max={MAX_ATTRIBUTE_LEVEL}
                valueClassName="hidden"
                onAdjust={(delta) =>
                  setAttributes((prev) => ({
                    ...prev,
                    [a.id]: Math.max(
                      0,
                      Math.min(MAX_ATTRIBUTE_LEVEL, prev[a.id] + delta),
                    ),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* Skills --------------------------------------------------- */}
      <section className="rounded-xl border border-gray-400 bg-background-200 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">
          Skills
        </h3>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
            >
              <span className="text-sm font-medium text-gray-1000">
                {s.name}
              </span>
              <InlineStepper
                ariaLabel={s.name}
                value={skills[s.id] ?? 0}
                min={0}
                max={MAX_SKILL_LEVEL}
                onAdjust={(delta) =>
                  setSkills((prev) => ({
                    ...prev,
                    [s.id]: Math.max(
                      0,
                      Math.min(MAX_SKILL_LEVEL, (prev[s.id] ?? 0) + delta),
                    ),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            navigate({ to: '/games/$gameId/npcs', params: { gameId } })
          }
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create NPC'}
        </Button>
      </div>
    </form>
  )
}
