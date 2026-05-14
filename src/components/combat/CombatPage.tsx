import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import type {
  Character,
  CombatParticipant,
  GameState,
} from '~/lib/types/database'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import { edgeCap } from '~/lib/game-logic/derived-stats'
import { sortByTurnOrder } from '~/lib/game-logic/combat'
import { Button } from '~/components/ui/Button'
import { lookupWeapon } from '~/lib/game-logic/weapons'
import { equippedArmor } from '~/lib/game-logic/armors'
import {
  adjustAp,
  endCombat,
  nextRound,
  startCombat,
} from '~/lib/server/combat'
import { updateInventoryItem } from '~/lib/server/inventory'
import { updateCharacter } from '~/lib/server/characters'
import { ApTimeline } from './ApTimeline'

interface CombatPageProps {
  game: { id: string; name: string }
  gameState: GameState
  characters: Character[]
  currentUserId: string
  isGm: boolean
}

export function CombatPage({
  game,
  gameState,
  characters,
  currentUserId,
  isGm,
}: CombatPageProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const combat = gameState.combat
  const characterById = new Map(characters.map((c) => [c.id, c]))

  async function withBusy<T>(key: string, fn: () => Promise<T>) {
    if (busy) return
    setBusy(key)
    setError(null)
    try {
      await fn()
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  function canAdjust(participant: CombatParticipant): boolean {
    if (isGm) return true
    const char = characterById.get(participant.characterId)
    return char?.user_id === currentUserId
  }

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/games/$gameId"
            params={{ gameId: game.id }}
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← {game.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Combat
            {combat && (
              <span className="ml-2 rounded-md border border-warning-500/60 bg-warning-500/15 px-2 py-0.5 align-middle text-xs font-semibold uppercase tracking-wide text-warning-400">
                Round {combat.round}
              </span>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isGm && !combat && (
            <Button
              onClick={() =>
                withBusy('start', () => startCombat({ data: { gameId: game.id } }))
              }
              disabled={busy !== null}
            >
              {busy === 'start' ? 'Starting…' : 'Start combat'}
            </Button>
          )}
          {isGm && combat && (
            <>
              <Button
                onClick={() =>
                  withBusy('round', () =>
                    nextRound({ data: { gameId: game.id } }),
                  )
                }
                disabled={busy !== null}
              >
                {busy === 'round' ? 'Rolling…' : 'Next round'}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!window.confirm('End combat? Clears the tracker.')) return
                  void withBusy('end', () =>
                    endCombat({ data: { gameId: game.id } }),
                  )
                }}
                disabled={busy !== null}
              >
                End
              </Button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-danger-500/60 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </div>
      )}

      {!combat ? (
        <div className="rounded-xl border border-void-600 bg-void-800 p-8 text-center text-sm text-gray-500">
          No combat is currently active.
          {!isGm && ' Wait for the GM to start an encounter.'}
        </div>
      ) : (
        <>
          <ApTimeline participants={combat.participants} />

          <div className="space-y-3">
            {sortByTurnOrder(combat.participants).map((participant) => {
              const character = characterById.get(participant.characterId)
              if (!character) return null
              // Hide other players' details — they still appear on the
              // timeline so everyone has tactical awareness of AP/turn order,
              // but their card-level state (HP, edge, ammo, durability)
              // stays private to them and the GM.
              if (!isGm && character.user_id !== currentUserId) return null
              return (
                <ParticipantCard
                  key={participant.characterId}
                  participant={participant}
                  character={character}
                  canAdjust={canAdjust(participant)}
                  busy={busy !== null}
                  gameId={game.id}
                  onAdjustAp={(delta) =>
                    withBusy(`ap:${participant.characterId}`, () =>
                      adjustAp({
                        data: {
                          gameId: game.id,
                          characterId: participant.characterId,
                          delta,
                        },
                      }),
                    )
                  }
                  onUpdateField={(updates) =>
                    withBusy(`field:${participant.characterId}`, () =>
                      updateCharacter({
                        data: { characterId: participant.characterId, updates },
                      }),
                    )
                  }
                  onAdjustAmmo={(itemId, ammo) =>
                    withBusy(`ammo:${itemId}`, () =>
                      updateInventoryItem({
                        data: {
                          owner: {
                            type: 'character',
                            characterId: participant.characterId,
                          },
                          itemId,
                          updates: { currentAmmo: ammo },
                        },
                      }),
                    )
                  }
                  onAdjustDurability={(itemId, durability) =>
                    withBusy(`dura:${itemId}`, () =>
                      updateInventoryItem({
                        data: {
                          owner: {
                            type: 'character',
                            characterId: participant.characterId,
                          },
                          itemId,
                          updates: { currentDurability: durability },
                        },
                      }),
                    )
                  }
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function ParticipantCard({
  participant,
  character,
  canAdjust,
  busy,
  gameId,
  onAdjustAp,
  onUpdateField,
  onAdjustAmmo,
  onAdjustDurability,
}: {
  participant: CombatParticipant
  character: Character
  canAdjust: boolean
  busy: boolean
  gameId: string
  onAdjustAp: (delta: number) => void
  onUpdateField: (updates: {
    health_current?: number | null
    edge_current?: number
  }) => void
  onAdjustAmmo: (itemId: string, ammo: number) => void
  onAdjustDurability: (itemId: string, durability: number) => void
}) {
  const { derived } = applyPassiveEffects(
    character.attributes,
    character.talents,
    character.cyberware,
    character.inventory,
  )
  const equippedWeapons = character.inventory.filter(
    (i) => i.source === 'weapon' && i.equipped && i.weaponRef,
  )
  const worn = equippedArmor(character.inventory)
  const healthCurrent = character.health_current ?? derived.health

  return (
    <article className="rounded-xl border border-void-600 bg-void-800 p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            to="/games/$gameId/characters/$characterId"
            params={{ gameId, characterId: character.id }}
            className="text-base font-semibold text-white transition hover:text-accent-200"
          >
            {participant.name}
          </Link>
          <span className="font-mono text-[11px] text-gray-500">
            base {participant.baseAp} + d6:{participant.rolled} ={' '}
            <span className="text-gray-300">
              {participant.baseAp + participant.rolled}
            </span>
          </span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stepper
          label="AP"
          value={participant.ap}
          onAdjust={(delta) => onAdjustAp(delta)}
          canEdit={canAdjust}
          busy={busy}
          valueTone={participant.ap < 0 ? 'danger' : 'accent'}
        />
        <Stepper
          label="Health"
          value={healthCurrent}
          max={derived.health}
          onAdjust={(delta) =>
            onUpdateField({
              health_current: Math.max(
                0,
                Math.min(derived.health, healthCurrent + delta),
              ),
            })
          }
          canEdit={canAdjust}
          busy={busy}
        />
        <Stepper
          label="Edge"
          value={character.edge_current}
          max={derived.edge}
          hardMax={edgeCap(derived.edge)}
          onAdjust={(delta) =>
            onUpdateField({
              edge_current: Math.max(
                0,
                Math.min(
                  edgeCap(derived.edge),
                  character.edge_current + delta,
                ),
              ),
            })
          }
          canEdit={canAdjust}
          busy={busy}
        />
      </div>

      {(equippedWeapons.length > 0 || worn) && (
        <div className="mt-3 space-y-2 border-t border-void-700 pt-3">
          {equippedWeapons.map((entry) => {
            const w = lookupWeapon(entry.weaponRef!)
            if (!w) return null
            const hasAmmo = w.magazine != null
            const current = entry.currentAmmo ?? w.magazine ?? 0
            return (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
              >
                <span className="font-medium text-white">{entry.name}</span>
                <span className="text-gray-500">
                  DMG {w.damage} · AP {w.attackAP}
                  {w.optimalRange ? ` · rng ${w.optimalRange}` : ''}
                </span>
                {hasAmmo && (
                  <span className="ml-auto inline-flex items-center gap-1.5">
                    <span className="text-gray-500">Ammo</span>
                    <MiniStepper
                      value={current}
                      max={w.magazine!}
                      canEdit={canAdjust}
                      busy={busy}
                      onAdjust={(delta) =>
                        onAdjustAmmo(entry.id, current + delta)
                      }
                    />
                    <span className="text-gray-500">/ {w.magazine}</span>
                    {canAdjust && (
                      <button
                        onClick={() => onAdjustAmmo(entry.id, w.magazine!)}
                        disabled={busy || current >= w.magazine!}
                        className="rounded border border-void-600 bg-void-700 px-1.5 py-0.5 text-[10px] text-gray-300 transition hover:border-accent-500 hover:text-white disabled:opacity-30"
                      >
                        Reload
                      </button>
                    )}
                  </span>
                )}
              </div>
            )
          })}
          {worn && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-medium text-white">{worn.entry.name}</span>
              <span className="text-gray-500">
                Soak{' '}
                {(() => {
                  const cur =
                    worn.entry.currentDurability ?? worn.data.durability ?? 0
                  const broken = worn.data.durability != null && cur <= 0
                  return broken ? worn.data.secondarySoak : worn.data.primarySoak
                })()}
              </span>
              {worn.data.durability != null && (
                <span className="ml-auto inline-flex items-center gap-1.5">
                  <span className="text-gray-500">Durability</span>
                  <MiniStepper
                    value={
                      worn.entry.currentDurability ?? worn.data.durability
                    }
                    max={worn.data.durability}
                    canEdit={canAdjust}
                    busy={busy}
                    onAdjust={(delta) =>
                      onAdjustDurability(
                        worn.entry.id,
                        (worn.entry.currentDurability ??
                          worn.data.durability!) + delta,
                      )
                    }
                  />
                  <span className="text-gray-500">/ {worn.data.durability}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function Stepper({
  label,
  value,
  max,
  hardMax,
  onAdjust,
  canEdit,
  busy,
  valueTone = 'default',
}: {
  label: string
  value: number
  max?: number
  hardMax?: number
  onAdjust: (delta: number) => void
  canEdit: boolean
  busy: boolean
  valueTone?: 'default' | 'accent' | 'danger'
}) {
  const ceiling = hardMax ?? max
  const tone =
    valueTone === 'accent'
      ? 'text-accent-200'
      : valueTone === 'danger'
        ? 'text-danger-400'
        : 'text-white'
  return (
    <div className="rounded-lg border border-void-700 bg-void-900/40 p-2">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onAdjust(-1)}
          disabled={!canEdit || busy}
          className="h-7 w-7 rounded border border-void-600 bg-void-700 text-sm text-gray-300 transition hover:border-accent-500 hover:text-white disabled:opacity-30"
        >
          −
        </button>
        <span className={`font-mono text-lg font-semibold ${tone}`}>
          {value}
          {max !== undefined && (
            <span className="ml-1 text-xs text-gray-500">/ {max}</span>
          )}
        </span>
        <button
          onClick={() => onAdjust(1)}
          disabled={
            !canEdit || busy || (ceiling !== undefined && value >= ceiling)
          }
          className="h-7 w-7 rounded border border-void-600 bg-void-700 text-sm text-gray-300 transition hover:border-accent-500 hover:text-white disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  )
}

function MiniStepper({
  value,
  max,
  canEdit,
  busy,
  onAdjust,
}: {
  value: number
  max: number
  canEdit: boolean
  busy: boolean
  onAdjust: (delta: number) => void
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {canEdit && (
        <button
          onClick={() => onAdjust(-1)}
          disabled={busy || value <= 0}
          className="h-5 w-5 rounded border border-void-600 bg-void-700 text-xs text-gray-300 transition hover:border-accent-500 hover:text-white disabled:opacity-30"
          aria-label="Decrease"
        >
          −
        </button>
      )}
      <span className="min-w-[1.25rem] text-center font-mono text-xs font-semibold text-white">
        {value}
      </span>
      {canEdit && (
        <button
          onClick={() => onAdjust(1)}
          disabled={busy || value >= max}
          className="h-5 w-5 rounded border border-void-600 bg-void-700 text-xs text-gray-300 transition hover:border-accent-500 hover:text-white disabled:opacity-30"
          aria-label="Increase"
        >
          +
        </button>
      )}
    </span>
  )
}
