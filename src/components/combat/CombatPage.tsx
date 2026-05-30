import { useCallback, useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { IconChevronRight } from '@tabler/icons-react'
import type {
  Character,
  CharacterAttributes,
  CombatParticipant,
  GameState,
  InjuryEntry,
  InventoryItem,
  PendingBonus,
} from '~/lib/types/database'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import { edgeCap } from '~/lib/game-logic/derived-stats'
import { sortByTurnOrder } from '~/lib/game-logic/combat'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { Stepper } from '~/components/ui/Stepper'
import {
  lookupWeapon,
  weaponAttackSkill,
  type WeaponData,
} from '~/lib/game-logic/weapons'
import { equippedArmor, type ArmorData } from '~/lib/game-logic/armors'
import {
  adjustAp,
  endCombat,
  joinCombat,
  leaveCombat,
  nextRound,
  startCombat,
} from '~/lib/server/combat'
import { updateInventoryItem } from '~/lib/server/inventory'
import { updateCharacter } from '~/lib/server/characters'
import { useDebouncedNumber } from '~/lib/hooks/useDebouncedNumber'
import { ApTimeline } from './ApTimeline'
import { ActionPanel } from './ActionPanel'
import { CombatRollModal } from './CombatRollModal'
import { CombatPickerModal } from './CombatPickerModal'
import { EquippedWeaponCard } from '~/components/character/EquippedWeaponCard'
import { EquippedArmorCard } from '~/components/character/EquippedArmorCard'
import { InjuryControls } from '~/components/character/InjuryControls'
import { PendingBonusChips } from '~/components/character/PendingBonusChips'

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
  // Per-card expand override. The set tracks participants whose state
  // diverges from the role default: GM defaults to collapsed (compact rows
  // for an at-a-glance party view), players default to expanded (their own
  // card front-and-center). Toggling adds/removes from the set in both
  // cases; the actual expanded state is derived per render.
  const [toggledCards, setToggledCards] = useState<Set<string>>(() => new Set())
  const combat = gameState.combat
  const characterById = new Map(characters.map((c) => [c.id, c]))
  const characterNames = new Map(characters.map((c) => [c.id, c.name]))
  const participantIds = new Set(
    combat?.participants.map((p) => p.characterId) ?? [],
  )
  const [pickerOpen, setPickerOpen] = useState<'start' | 'join' | null>(null)

  /**
   * "Yours to add" — characters the caller is allowed to put into combat:
   *   - GM: anyone.
   *   - Player: their own PC, or any NPC they control.
   *
   * The picker modal further filters out anyone already in
   * `participantIds`.
   */
  function canAddToCombat(c: Character): boolean {
    if (isGm) return true
    if (c.is_npc) return c.controller_user_id === currentUserId
    return c.user_id === currentUserId
  }
  const userCanJoin =
    !!combat &&
    characters.some((c) => canAddToCombat(c) && !participantIds.has(c.id))

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
    return (
      char?.user_id === currentUserId ||
      char?.controller_user_id === currentUserId
    )
  }

  function toggleExpanded(characterId: string) {
    setToggledCards((prev) => {
      const next = new Set(prev)
      if (next.has(characterId)) next.delete(characterId)
      else next.add(characterId)
      return next
    })
  }

  const ordered = combat ? sortByTurnOrder(combat.participants) : []
  const activeCharacterId = ordered[0]?.characterId

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
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
              onClick={() => setPickerOpen('start')}
              disabled={gmBusy !== null}
            >
              Start combat
            </Button>
          )}
          {combat && userCanJoin && (
            <Button
              variant="secondary"
              onClick={() => setPickerOpen('join')}
              disabled={gmBusy !== null}
            >
              {isGm ? 'Add to combat' : 'Join combat'}
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

          <div className="space-y-2">
            {ordered.map((participant) => {
              const character = characterById.get(participant.characterId)
              if (!character) return null
              // Hide other players' details — they still appear on the
              // timeline so everyone has tactical awareness of AP/turn order,
              // but their card-level state (HP, edge, ammo, durability)
              // stays private to them and the GM.
              if (!isGm && character.user_id !== currentUserId) return null
              const isActive = participant.characterId === activeCharacterId
              const overridden = toggledCards.has(participant.characterId)
              // GM default = collapsed; player default = expanded. The
              // override set just inverts the default per-card.
              const expanded = isGm ? overridden : !overridden
              return (
                <ParticipantCard
                  key={participant.characterId}
                  participant={participant}
                  character={character}
                  canAdjust={canAdjust(participant)}
                  apBusy={apBusyChars.has(participant.characterId)}
                  gameId={game.id}
                  isGm={isGm}
                  isActive={isActive}
                  expanded={expanded}
                  onToggleExpanded={() =>
                    toggleExpanded(participant.characterId)
                  }
                  onAdjustAp={(delta) =>
                    adjustParticipantAp(participant.characterId, delta)
                  }
                  onLeave={async () => {
                    const label = character.name || 'this character'
                    if (
                      !window.confirm(
                        `Remove ${label} from combat? Any AP/HP changes during the encounter stay on the character.`,
                      )
                    )
                      return
                    try {
                      await leaveCombat({
                        data: {
                          gameId: game.id,
                          characterId: participant.characterId,
                        },
                      })
                      void router.invalidate()
                    } catch (e) {
                      handleSaveError(e)
                    }
                  }}
                  onSaveError={handleSaveError}
                />
              )
            })}
          </div>
        </>
      )}

      {pickerOpen && (
        <CombatPickerModal
          title={
            pickerOpen === 'start'
              ? 'Start combat — pick the participants'
              : isGm
                ? 'Add to combat'
                : 'Join combat'
          }
          characters={characters}
          excludeIds={participantIds}
          defaultChecked={(c) =>
            // Start: pre-tick PCs (typical encounter includes the players).
            // Join: nothing pre-ticked; caller picks what to add.
            pickerOpen === 'start' && !c.is_npc
          }
          canPick={canAddToCombat}
          confirmLabel={
            pickerOpen === 'start' ? 'Start combat' : 'Add to combat'
          }
          busy={gmBusy === 'picker'}
          onClose={() => setPickerOpen(null)}
          onSubmit={async (ids) => {
            setGmBusy('picker')
            setError(null)
            try {
              if (pickerOpen === 'start') {
                await startCombat({
                  data: { gameId: game.id, characterIds: ids },
                })
              } else {
                // Add one by one — joinCombat takes a single character.
                // Sequential because each call read-modify-writes the
                // shared combat blob.
                for (const id of ids) {
                  await joinCombat({
                    data: { gameId: game.id, characterId: id },
                  })
                }
              }
              setPickerOpen(null)
              void router.invalidate()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Failed')
            } finally {
              setGmBusy(null)
            }
          }}
        />
      )}
    </div>
  )
}

interface ParticipantCardProps {
  participant: CombatParticipant
  character: Character
  canAdjust: boolean
  apBusy: boolean
  gameId: string
  isGm: boolean
  isActive: boolean
  expanded: boolean
  onToggleExpanded: () => void
  onAdjustAp: (delta: number) => void
  onLeave: () => Promise<void> | void
  onSaveError: (error: unknown) => void
}

function ParticipantCard({
  participant,
  character,
  canAdjust,
  apBusy,
  gameId,
  isGm,
  isActive,
  expanded,
  onToggleExpanded,
  onAdjustAp,
  onLeave,
  onSaveError,
}: ParticipantCardProps) {
  const effects = applyPassiveEffects(
    character.attributes,
    character.talents,
    character.cyberware,
    character.inventory,
    character.derived_stat_bonuses,
  )
  const { derived, attributes: effectiveAttributes } = effects
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

  // Injuries are an array, not a number — useDebouncedNumber doesn't fit.
  // Operations (apply / treat / remove) are discrete and infrequent, so a
  // straight optimistic-then-save pattern is enough. Re-sync from props when
  // the upstream character row changes (e.g. realtime).
  const [injuries, setInjuries] = useState<InjuryEntry[]>(character.injuries)
  useEffect(() => {
    setInjuries(character.injuries)
  }, [character.injuries])

  async function saveInjuries(next: InjuryEntry[]) {
    setInjuries(next)
    try {
      await updateCharacter({
        data: { characterId: character.id, updates: { injuries: next } },
      })
    } catch (e) {
      onSaveError(e)
    }
  }

  // Pending bonuses follow the same optimistic-then-save pattern as injuries.
  const [pendingBonuses, setPendingBonuses] = useState<PendingBonus[]>(
    character.pending_bonuses,
  )
  useEffect(() => {
    setPendingBonuses(character.pending_bonuses)
  }, [character.pending_bonuses])

  async function savePendingBonuses(next: PendingBonus[]) {
    setPendingBonuses(next)
    try {
      await updateCharacter({
        data: {
          characterId: character.id,
          updates: { pending_bonuses: next },
        },
      })
    } catch (e) {
      onSaveError(e)
    }
  }

  const applyBonus = (bonus: ApplyBonusInput): string => {
    const entry: PendingBonus = {
      id: crypto.randomUUID(),
      label: bonus.label,
      modifier: bonus.modifier,
      source: bonus.source,
      addedAt: new Date().toISOString(),
    }
    void savePendingBonuses([...pendingBonuses, entry])
    return entry.id
  }
  const consumeBonuses = (ids: string[]) => {
    if (ids.length === 0) return
    const drop = new Set(ids)
    void savePendingBonuses(pendingBonuses.filter((b) => !drop.has(b.id)))
  }
  const removeBonus = (id: string) => consumeBonuses([id])

  // Compact row — single line summary, click anywhere to expand. Used in
  // the GM party overview and when a player collapses their own card.
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggleExpanded}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2 text-left transition ${
          isActive
            ? 'border-accent-700 bg-accent-100'
            : 'border-gray-400 bg-background-200 hover:border-accent-700'
        }`}
        aria-expanded={false}
        aria-label={`Expand ${character.name}`}
      >
        <Chevron open={false} />
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-semibold text-white">
            {character.name}
          </span>
          {isActive && (
            <span className="rounded border border-accent-700/60 bg-accent-700/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-900">
              Active
            </span>
          )}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2 text-xs">
          {pendingBonuses.length > 0 && (
            // Read-only in the compact row — nested clickable buttons would
            // be invalid HTML inside the row's own button. Expand to remove.
            <PendingBonusChips
              bonuses={pendingBonuses}
              canEdit={false}
              onRemove={removeBonus}
              compact
            />
          )}
          <StatChip
            label="AP"
            value={participant.ap}
            tone={participant.ap < 0 ? 'danger' : 'accent'}
          />
          <StatChip
            label="HP"
            value={`${healthCurrent}/${derived.health}`}
            tone={healthCurrent <= 0 ? 'danger' : 'neutral'}
          />
          <StatChip label="Edge" value={`${edgeCurrent}/${derived.edge}`} />
        </span>
      </button>
    )
  }

  return (
    <article
      className={`rounded-xl border p-4 ${
        isActive
          ? 'border-accent-700 bg-gradient-to-b from-accent-700/20 via-background-200 to-background-200'
          : 'border-gray-400 bg-background-200'
      }`}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <button
            type="button"
            onClick={onToggleExpanded}
            className="mr-0.5 inline-flex h-5 w-5 items-center justify-center rounded text-gray-700 transition hover:bg-gray-100 hover:text-white"
            aria-label={`Collapse ${character.name}`}
            aria-expanded={true}
          >
            <Chevron open={true} />
          </button>
          <Link
            to={
              character.is_npc
                ? '/games/$gameId/npcs/$npcId'
                : '/games/$gameId/characters/$characterId'
            }
            params={
              character.is_npc
                ? { gameId, npcId: character.id }
                : { gameId, characterId: character.id }
            }
            className="text-base font-semibold text-white transition hover:text-accent-900"
          >
            {character.name}
          </Link>
          {isActive && (
            <span className="rounded border border-accent-700/60 bg-accent-700/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-900">
              Active
            </span>
          )}
          <span className="text-[11px] text-gray-700">
            base {participant.baseAp} + d6:{participant.rolled}
            {participant.apOverflow != null && participant.apOverflow < 0 && (
              <span className="text-danger-900">
                {' '}
                − {Math.abs(participant.apOverflow)} carry
              </span>
            )}{' '}
            ={' '}
            <span className="text-gray-1000">
              {participant.baseAp +
                participant.rolled +
                (participant.apOverflow ?? 0)}
            </span>
          </span>
        </div>
        {canAdjust && (
          <Button
            variant="ghostDanger"
            size="sm"
            onClick={() => void onLeave()}
            aria-label={`Remove ${character.name} from combat`}
            title="Leave combat"
            className="gap-1"
          >
            <span aria-hidden>×</span>
            <span>Leave</span>
          </Button>
        )}
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

      <div className="mt-3">
        <InjuryControls
          gameId={gameId}
          characterId={character.id}
          injuries={injuries}
          edgeCurrent={edgeCurrent}
          edgeHardMax={edgeHardMax}
          canEdit={canAdjust}
          isMinion={character.is_minion}
          defaultHidden={character.is_npc && !character.visible_to_players}
          onInjuriesChange={saveInjuries}
          onEdgeChange={setEdgeCurrent}
        />
      </div>

      {pendingBonuses.length > 0 && (
        <div className="mt-3">
          <PendingBonusChips
            bonuses={pendingBonuses}
            canEdit={canAdjust}
            onRemove={removeBonus}
          />
        </div>
      )}

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
                gameId={gameId}
                characterId={character.id}
                effectiveAttributes={effectiveAttributes}
                skills={character.skills}
                canEdit={canAdjust}
                onSaveError={onSaveError}
                onDebitAp={(amount) => onAdjustAp(-amount)}
                edgeAvailable={edgeCurrent}
                onSpendEdge={() => setEdgeCurrent(Math.max(0, edgeCurrent - 1))}
                pendingBonuses={pendingBonuses}
                onApplyBonus={applyBonus}
                onConsumeBonuses={consumeBonuses}
                onRemoveBonus={removeBonus}
                defaultHidden={
                  character.is_npc && !character.visible_to_players
                }
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

      <div className="mt-3 border-t border-gray-400 pt-3">
        <ActionPanel
          gameId={gameId}
          characterId={character.id}
          effectiveAttributes={effectiveAttributes}
          skills={character.skills}
          canEdit={canAdjust}
          onDebitAp={(amount) => onAdjustAp(-amount)}
          edgeAvailable={edgeCurrent}
          onSpendEdge={() => setEdgeCurrent(Math.max(0, edgeCurrent - 1))}
          pendingBonuses={pendingBonuses}
          onApplyBonus={applyBonus}
          onConsumeBonuses={consumeBonuses}
          onRemoveBonus={removeBonus}
          defaultHidden={character.is_npc && !character.visible_to_players}
        />
      </div>
    </article>
  )
}

interface WeaponRowProps {
  entry: InventoryItem
  weapon: WeaponData
  gameId: string
  characterId: string
  effectiveAttributes: CharacterAttributes
  skills: Record<string, number>
  canEdit: boolean
  onSaveError: (error: unknown) => void
  /** Positive amount = AP to subtract. */
  onDebitAp: (amount: number) => void
  /** Pass `undefined` for NPCs to hide the spend-Edge affordance. */
  edgeAvailable: number | undefined
  onSpendEdge: () => void
  pendingBonuses: PendingBonus[]
  onApplyBonus: (bonus: ApplyBonusInput) => string
  onConsumeBonuses: (ids: string[]) => void
  onRemoveBonus: (id: string) => void
  defaultHidden?: boolean
}

function WeaponRow({
  entry,
  weapon,
  gameId,
  characterId,
  effectiveAttributes,
  skills,
  canEdit,
  onSaveError,
  onDebitAp,
  edgeAvailable,
  onSpendEdge,
  pendingBonuses,
  onApplyBonus,
  onConsumeBonuses,
  onRemoveBonus,
  defaultHidden,
}: WeaponRowProps) {
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
  const [attacking, setAttacking] = useState(false)
  const skillId = weaponAttackSkill(weapon)

  function handleReload() {
    if (!canEdit || !hasAmmo) return
    if (weapon.reloadAP != null) {
      onDebitAp(weapon.reloadAP)
    }
    setAmmo(weapon.magazine!)
  }

  const reloadDisabled = !canEdit || !hasAmmo || ammo >= (weapon.magazine ?? 0)
  const outOfAmmo = hasAmmo && ammo <= 0

  return (
    <>
      <EquippedWeaponCard
        entry={entry}
        weapon={weapon}
        currentAmmo={ammo}
        footer={
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasAmmo && (
              <div className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-gray-700">Ammo</span>
                <MiniStepper
                  value={ammo}
                  max={weapon.magazine!}
                  canEdit={canEdit}
                  onAdjust={(delta) =>
                    setAmmo(
                      Math.max(0, Math.min(weapon.magazine!, ammo + delta)),
                    )
                  }
                />
              </div>
            )}
            {weapon.reloadAP != null && hasAmmo && (
              <Button
                variant="subtle"
                size="sm"
                onClick={handleReload}
                disabled={reloadDisabled}
                title={`Spends ${weapon.reloadAP} AP and refills the magazine`}
                className="gap-1.5"
              >
                <span>Reload</span>
                <span className="rounded bg-background-100/40 px-1 py-0.5 text-[10px] tabular-nums text-gray-1000">
                  {weapon.reloadAP} AP
                </span>
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAttacking(true)}
              disabled={!canEdit || outOfAmmo}
              title={
                outOfAmmo
                  ? 'Out of ammo — reload first'
                  : `Spends ${weapon.attackAP} AP and rolls ${skillId}`
              }
              className="ml-auto gap-1.5"
            >
              <span>Attack</span>
              <span className="rounded bg-background-100/40 px-1 py-0.5 text-[10px] tabular-nums text-white">
                {weapon.attackAP} AP
              </span>
            </Button>
          </div>
        }
      />
      {attacking && (
        <CombatRollModal
          gameId={gameId}
          characterId={characterId}
          effectiveAttributes={effectiveAttributes}
          skills={skills}
          skillId={skillId}
          apCost={weapon.attackAP}
          contextLabel={`Combat · Attack — ${entry.name}`}
          weapon={weapon}
          edgeAvailable={edgeAvailable}
          onSpendEdge={onSpendEdge}
          pendingBonuses={pendingBonuses}
          onApplyBonus={onApplyBonus}
          onConsumeBonuses={onConsumeBonuses}
          onRemoveBonus={onRemoveBonus}
          defaultHidden={defaultHidden}
          onApCommit={() => onDebitAp(weapon.attackAP)}
          onClose={() => setAttacking(false)}
        />
      )}
    </>
  )
}

interface ArmorRowProps {
  entry: InventoryItem
  armor: ArmorData
  characterId: string
  canEdit: boolean
  onSaveError: (error: unknown) => void
}

function ArmorRow({
  entry,
  armor,
  characterId,
  canEdit,
  onSaveError,
}: ArmorRowProps) {
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
  return (
    <EquippedArmorCard
      entry={entry}
      armor={armor}
      currentDurability={durability}
      footer={
        hasDurability ? (
          <div className="mt-3 inline-flex items-center gap-1.5">
            <span className="text-[11px] text-gray-700">Durability</span>
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
          </div>
        ) : null
      }
    />
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

function StatChip({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number | string
  tone?: 'neutral' | 'accent' | 'danger'
}) {
  const valueClass =
    tone === 'danger'
      ? 'text-danger-900'
      : tone === 'accent'
        ? 'text-accent-900'
        : 'text-gray-1000'
  return (
    <span className="inline-flex items-baseline gap-1 rounded border border-gray-400 bg-gray-100 px-1.5 py-0.5">
      <span className="text-[10px] uppercase tracking-wide text-gray-700">
        {label}
      </span>
      <span className={`text-xs font-semibold tabular-nums ${valueClass}`}>
        {value}
      </span>
    </span>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <IconChevronRight
      size={12}
      aria-hidden
      className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
    />
  )
}
