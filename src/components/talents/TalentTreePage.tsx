import { useEffect, useMemo, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import type { Character } from '~/lib/types/database'
import {
  careersOfCharacter,
  pointsSpent,
  pointsTotal,
  canUnlock,
  canRemove,
  type CareerData,
} from '~/lib/game-logic/talents'
import { unlockTalent, removeTalent, grantTalent } from '~/lib/server/characters'
import careersData from '~/data/careers.json'
import talentsData from '~/data/talents.json'
import { TalentBudgetBar } from './TalentBudgetBar'
import { TalentTreeCareer } from './TalentTreeCareer'
import { TalentDetailRail } from './TalentDetailRail'
import type { NodeState } from './TalentNode'
import { ManualAddTalent } from './ManualAddTalent'

interface TalentTreePageProps {
  initial: Character
  canEdit: boolean
}

import type { TalentEffect } from '~/lib/game-logic/talent-effects'

interface TalentMeta {
  name: string
  description: string
  effects?: TalentEffect[]
}
const ALL_TALENTS = talentsData as TalentMeta[]
const ALL_CAREERS = careersData as CareerData[]

export function TalentTreePage({ initial, canEdit }: TalentTreePageProps) {
  const router = useRouter()
  const [character, setCharacter] = useState<Character>(initial)
  const [selected, setSelected] = useState<{
    name: string
    career: string
    tier: number
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualAdd, setShowManualAdd] = useState(false)

  useEffect(() => {
    setCharacter(initial)
  }, [initial])

  const descriptionByName = useMemo(
    () => new Map(ALL_TALENTS.map((t) => [t.name, t.description])),
    [],
  )
  const effectsByName = useMemo(
    () =>
      new Map(
        ALL_TALENTS.filter((t) => t.effects?.length).map(
          (t) => [t.name, t.effects!] as const,
        ),
      ),
    [],
  )
  const careerNames = careersOfCharacter(character)
  const careers = careerNames
    .map((name) => ALL_CAREERS.find((c) => c.name === name))
    .filter((c): c is CareerData => Boolean(c))

  const total = pointsTotal(character.level)
  const spent = pointsSpent(character.talents)
  const available = total - spent

  const selectedState: NodeState | null = useMemo(() => {
    if (!selected) return null
    const owned = character.talents.some((t) => t.name === selected.name)
    if (owned) return 'owned'
    const check = canUnlock(character, selected.career, selected.name, ALL_CAREERS)
    if (check.ok) return 'available'
    if (check.reason?.startsWith('No talent points')) return 'locked-no-points'
    return 'locked-prereq'
  }, [selected, character])

  const selectedReason = useMemo(() => {
    if (!selected) return undefined
    if (selectedState === 'owned' || selectedState === 'available') return undefined
    const check = canUnlock(character, selected.career, selected.name, ALL_CAREERS)
    return check.reason
  }, [selected, selectedState, character])

  async function handleUnlock() {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    try {
      const updated = await unlockTalent({
        data: {
          characterId: character.id,
          talentName: selected.name,
          career: selected.career,
        },
      })
      setCharacter(updated)
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unlock talent')
    } finally {
      setBusy(false)
    }
  }

  async function handleManualAdd(talentName: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const updated = await grantTalent({
        data: { characterId: character.id, talentName },
      })
      setCharacter(updated)
      setShowManualAdd(false)
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add talent')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!selected || busy) return
    const check = canRemove(character, selected.name)
    if (!check.ok) {
      setError(check.reason ?? 'Cannot remove this talent.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await removeTalent({
        data: { characterId: character.id, talentName: selected.name },
      })
      setCharacter(updated)
      setSelected(null)
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove talent')
    } finally {
      setBusy(false)
    }
  }

  const selectedDescription = selected
    ? (descriptionByName.get(selected.name) ?? null)
    : null
  const selectedGranted = selected
    ? (character.talents.find((t) => t.name === selected.name)?.granted ?? false)
    : false
  const grantedTalents = character.talents.filter((t) => t.granted)

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/games/$gameId/characters/$characterId"
            params={{ gameId: character.game_id, characterId: character.id }}
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← {character.name || 'Character'}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Talents</h1>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setShowManualAdd(true)}
              className="rounded-lg border border-void-600 bg-void-700 px-3 py-1.5 text-sm text-gray-300 transition hover:border-accent-500 hover:text-white"
            >
              + Add manual talent
            </button>
          )}
          <TalentBudgetBar spent={spent} total={total} />
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-danger-500/60 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {careers.length === 0 ? (
            <div className="rounded-xl border border-void-600 bg-void-800 p-6 text-sm text-gray-400">
              No career set for this character. Set a career on the sheet to
              see its talent tree.
            </div>
          ) : (
            careers.map((c) => (
              <TalentTreeCareer
                key={c.name}
                career={c}
                talents={character.talents}
                pointsAvailable={available}
                selectedName={selected?.name ?? null}
                descriptionByName={descriptionByName}
                onSelect={(name, career, tier) =>
                  setSelected({ name, career, tier })
                }
              />
            ))
          )}

          {grantedTalents.length > 0 && (
            <section className="rounded-xl border border-cyber-500/40 bg-void-800 p-4">
              <header className="mb-3 flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-white">Granted</h3>
                <span className="text-xs text-gray-500">
                  Bonus talents outside the normal career tree
                </span>
              </header>
              <div className="flex flex-wrap gap-2">
                {grantedTalents.map((t) => (
                  <button
                    key={t.name}
                    onClick={() =>
                      setSelected({ name: t.name, career: '', tier: t.tier })
                    }
                    className={`flex w-44 shrink-0 flex-col items-stretch rounded-lg border bg-accent-500/20 p-2 text-left text-xs text-white transition hover:bg-accent-500/30 ${
                      selected?.name === t.name
                        ? 'border-cyber-400 ring-2 ring-cyber-400'
                        : 'border-cyber-500/40'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="text-sm leading-none text-cyber-300">✓</span>
                      <span className="flex-1 truncate font-medium">{t.name}</span>
                    </div>
                    <div className="line-clamp-2 text-[11px] text-gray-400">
                      {descriptionByName.get(t.name) ?? ''}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <TalentDetailRail
            name={selected?.name ?? null}
            description={selectedDescription}
            tier={selected?.tier ?? null}
            career={selected?.career ?? null}
            granted={selectedGranted}
            effects={selected ? effectsByName.get(selected.name) : undefined}
            state={selectedState}
            reason={selectedReason}
            canEdit={canEdit}
            onUnlock={handleUnlock}
            onRemove={handleRemove}
            busy={busy}
          />
        </aside>
      </div>

      <div className="flex flex-wrap gap-3 pt-2 text-xs text-gray-500">
        <Legend glyph="✓" label="Unlocked" />
        <Legend glyph="◯" label="Available" />
        <Legend glyph="◌" label="No points" />
        <Legend glyph="─" label="Prereq missing" />
      </div>

      {showManualAdd && (
        <ManualAddTalent
          ownedNames={new Set(character.talents.map((t) => t.name))}
          busy={busy}
          onAdd={handleManualAdd}
          onClose={() => setShowManualAdd(false)}
        />
      )}
    </div>
  )
}

function Legend({ glyph, label }: { glyph: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-void-600 bg-void-700 text-[10px]">
        {glyph}
      </span>
      {label}
    </span>
  )
}
