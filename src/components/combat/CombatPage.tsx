import { useCallback, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import type {
  Character,
  CombatParticipant,
  GameState,
  InventoryItem,
} from '~/lib/types/database'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import { edgeCap } from '~/lib/game-logic/derived-stats'
import { sortByTurnOrder } from '~/lib/game-logic/combat'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { Stepper } from '~/components/ui/Stepper'
import { lookupWeapon, type WeaponData } from '~/lib/game-logic/weapons'
import { equippedArmor, type ArmorData } from '~/lib/game-logic/armors'
import {
  adjustAp,
  endCombat,
  nextRound,
  startCombat,
} from '~/lib/server/combat'
import { updateInventoryItem } from '~/lib/server/inventory'
import { updateCharacter } from '~/lib/server/characters'
import { useDebouncedNumber } from '~/lib/hooks/useDebouncedNumber'
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
  const [gmBusy, setGmBusy] = useState<string | null>(null)
  const [apBusyChars, setApBusyChars] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const combat = gameState.combat
  const characterById = new Map(characters.map((c) => [c.id, c]))
  const characterNames = new Map(characters.map((c) => [c.id, c.name]))

  async function withGmBusy<T>(key: string, fn: () => Promise<T>) {
    if (gmBusy) return
    setGmBusy(key)
    setError(null)
    try {
      await fn()
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setGmBusy(null)
    }
  }

  /**
   * AP stays a synchronous server call because `game_state.combat` is a
   * shared JSONB blob — concurrent `adjustAp` calls do a read-modify-
   * write that can clobber each other. Per-character busy guards
   * against firing a second AP write for the same character while the
   * first is in flight, but lets other characters be adjusted in
   * parallel.
   */
  const adjustParticipantAp = useCallback(
    async (characterId: string, delta: number) => {
      if (apBusyChars.has(characterId)) return
      setApBusyChars((prev) => {
        const next = new Set(prev)
        next.add(characterId)
        return next
      })
      setError(null)
      try {
        await adjustAp({
          data: { gameId: game.id, characterId, delta },
        })
        void router.invalidate()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        setApBusyChars((prev) => {
          const next = new Set(prev)
          next.delete(characterId)
          return next
        })
      }
    },
    [apBusyChars, game.id, router],
  )

  const handleSaveError = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : 'Failed')
  }, [])

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
            className="text-sm text-gray-900 transition hover:text-white"
          >
            ← {game.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Combat
            {combat && (
              <span className="ml-2 rounded-md border border-warning-700/60 bg-warning-700/15 px-2 py-0.5 align-middle text-xs font-semibold uppercase tracking-wide text-warning-900">
                Round {combat.round}
              </span>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isGm && !combat && (
            <Button
              onClick={() =>
                withGmBusy('start', () =>
                  startCombat({ data: { gameId: game.id } }),
                )
              }
              disabled={gmBusy !== null}
            >
              {gmBusy === 'start' ? 'Starting…' : 'Start combat'}
            </Button>
          )}
          {isGm && combat && (
            <>
              <Button
                onClick={() =>
                  withGmBusy('round', () =>
                    nextRound({ data: { gameId: game.id } }),
                  )
                }
                disabled={gmBusy !== null}
              >
                {gmBusy === 'round' ? 'Rolling…' : 'Next round'}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!window.confirm('End combat? Clears the tracker.')) return
                  void withGmBusy('end', () =>
                    endCombat({ data: { gameId: game.id } }),
                  )
                }}
                disabled={gmBusy !== null}
              >
                End
              </Button>
            </>
          )}
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {!combat ? (
        <div className="rounded-xl border border-gray-400 bg-background-200 p-8 text-center text-sm text-gray-700">
          No combat is currently active.
          {!isGm && ' Wait for the GM to start an encounter.'}
        </div>
      ) : (
        <>
          <ApTimeline
            participants={combat.participants}
            characterNames={characterNames}
          />

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
                  apBusy={apBusyChars.has(participant.characterId)}
                  gameId={game.id}
                  onAdjustAp={(delta) =>
                    adjustParticipantAp(participant.characterId, delta)
                  }
                  onSaveError={handleSaveError}
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
  apBusy,
  gameId,
  onAdjustAp,
  onSaveError,
}: {
  participant: CombatParticipant
  character: Character
  canAdjust: boolean
  apBusy: boolean
  gameId: string
  onAdjustAp: (delta: number) => void
  onSaveError: (error: unknown) => void
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
  const edgeHardMax = edgeCap(derived.edge)

  const [healthCurrent, setHealthCurrent] = useDebouncedNumber({
    initial: character.health_current ?? derived.health,
    canEdit: canAdjust,
    onError: onSaveError,
    save: (value) =>
      updateCharacter({
        data: {
          characterId: character.id,
          // Match the sheet's convention: when health is at max, the
          // stored value is null so the column tracks the derived max.
          updates: { health_current: value >= derived.health ? null : value },
        },
      }),
  })

  const [edgeCurrent, setEdgeCurrent] = useDebouncedNumber({
    initial: character.edge_current,
    canEdit: canAdjust,
    onError: onSaveError,
    save: (value) =>
      updateCharacter({
        data: { characterId: character.id, updates: { edge_current: value } },
      }),
  })

  return (
    <article className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            to="/games/$gameId/characters/$characterId"
            params={{ gameId, characterId: character.id }}
            className="text-base font-semibold text-white transition hover:text-accent-900"
          >
            {character.name}
          </Link>
          <span className="text-[11px] text-gray-700">
            base {participant.baseAp} + d6:{participant.rolled} ={' '}
            <span className="text-gray-1000">
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
          busy={apBusy}
          valueTone={participant.ap < 0 ? 'danger' : 'accent'}
        />
        <Stepper
          label="Health"
          value={healthCurrent}
          max={derived.health}
          min={0}
          onAdjust={(delta) =>
            setHealthCurrent(
              Math.max(0, Math.min(derived.health, healthCurrent + delta)),
            )
          }
          canEdit={canAdjust}
        />
        <Stepper
          label="Edge"
          value={edgeCurrent}
          max={derived.edge}
          hardMax={edgeHardMax}
          min={0}
          onAdjust={(delta) =>
            setEdgeCurrent(
              Math.max(0, Math.min(edgeHardMax, edgeCurrent + delta)),
            )
          }
          canEdit={canAdjust}
        />
      </div>

      {(equippedWeapons.length > 0 || worn) && (
        <div className="mt-3 space-y-2 border-t border-gray-400 pt-3">
          {equippedWeapons.map((entry) => {
            const w = lookupWeapon(entry.weaponRef!)
            if (!w) return null
            return (
              <WeaponRow
                key={entry.id}
                entry={entry}
                weapon={w}
                characterId={character.id}
                canEdit={canAdjust}
                onSaveError={onSaveError}
              />
            )
          })}
          {worn && (
            <ArmorRow
              entry={worn.entry}
              armor={worn.data}
              characterId={character.id}
              canEdit={canAdjust}
              onSaveError={onSaveError}
            />
          )}
        </div>
      )}
    </article>
  )
}

function WeaponRow({
  entry,
  weapon,
  characterId,
  canEdit,
  onSaveError,
}: {
  entry: InventoryItem
  weapon: WeaponData
  characterId: string
  canEdit: boolean
  onSaveError: (error: unknown) => void
}) {
  const hasAmmo = weapon.magazine != null
  const [ammo, setAmmo] = useDebouncedNumber({
    initial: entry.currentAmmo ?? weapon.magazine ?? 0,
    canEdit,
    onError: onSaveError,
    save: (value) =>
      updateInventoryItem({
        data: {
          owner: { type: 'character', characterId },
          itemId: entry.id,
          updates: { currentAmmo: value },
        },
      }),
  })
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-medium text-white">{entry.name}</span>
      <span className="text-gray-700">
        DMG {weapon.damage} · AP {weapon.attackAP}
        {weapon.optimalRange ? ` · rng ${weapon.optimalRange}` : ''}
      </span>
      {hasAmmo && (
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="text-gray-700">Ammo</span>
          <MiniStepper
            value={ammo}
            max={weapon.magazine!}
            canEdit={canEdit}
            onAdjust={(delta) =>
              setAmmo(Math.max(0, Math.min(weapon.magazine!, ammo + delta)))
            }
          />
          <span className="text-gray-700">/ {weapon.magazine}</span>
          {canEdit && (
            <button
              onClick={() => setAmmo(weapon.magazine!)}
              disabled={ammo >= weapon.magazine!}
              className="rounded border border-gray-400 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-1000 transition not-disabled:hover:border-accent-700 not-disabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Reload
            </button>
          )}
        </span>
      )}
    </div>
  )
}

function ArmorRow({
  entry,
  armor,
  characterId,
  canEdit,
  onSaveError,
}: {
  entry: InventoryItem
  armor: ArmorData
  characterId: string
  canEdit: boolean
  onSaveError: (error: unknown) => void
}) {
  const hasDurability = armor.durability != null
  const [durability, setDurability] = useDebouncedNumber({
    initial: entry.currentDurability ?? armor.durability ?? 0,
    canEdit,
    onError: onSaveError,
    save: (value) =>
      updateInventoryItem({
        data: {
          owner: { type: 'character', characterId },
          itemId: entry.id,
          updates: { currentDurability: value },
        },
      }),
  })
  const broken = hasDurability && durability <= 0
  const soak = broken ? armor.secondarySoak : armor.primarySoak
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-medium text-white">{entry.name}</span>
      <span className="text-gray-700">Soak {soak}</span>
      {hasDurability && (
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="text-gray-700">Durability</span>
          <MiniStepper
            value={durability}
            max={armor.durability!}
            canEdit={canEdit}
            onAdjust={(delta) =>
              setDurability(
                Math.max(0, Math.min(armor.durability!, durability + delta)),
              )
            }
          />
          <span className="text-gray-700">/ {armor.durability}</span>
        </span>
      )}
    </div>
  )
}


function MiniStepper({
  value,
  max,
  canEdit,
  onAdjust,
}: {
  value: number
  max: number
  canEdit: boolean
  onAdjust: (delta: number) => void
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {canEdit && (
        <button
          onClick={() => onAdjust(-1)}
          disabled={value <= 0}
          className="h-5 w-5 rounded border border-gray-400 bg-gray-100 text-xs text-gray-1000 transition not-disabled:hover:border-accent-700 not-disabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Decrease"
        >
          −
        </button>
      )}
      <span className="min-w-[1.25rem] text-center text-xs font-semibold text-white">
        {value}
      </span>
      {canEdit && (
        <button
          onClick={() => onAdjust(1)}
          disabled={value >= max}
          className="h-5 w-5 rounded border border-gray-400 bg-gray-100 text-xs text-gray-1000 transition not-disabled:hover:border-accent-700 not-disabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Increase"
        >
          +
        </button>
      )}
    </span>
  )
}
