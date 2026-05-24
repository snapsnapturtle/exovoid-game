import { useMemo, useState } from 'react'
import { DieCounter } from './Die'
import { rollDice, type DiceRollData } from '~/lib/server/dice'
import { applyModifier, type DicePool } from '~/lib/game-logic/dice'
import {
  useDiceFeedBroadcast,
  useDiceFeedRefresh,
} from '~/lib/hooks/diceFeedContext'
import { RollResultView, type ApplyBonusInput } from './RollResultView'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'
import type { PendingBonus } from '~/lib/types/database'

interface DiceRollerProps {
  gameId: string
  characterId: string | null
  skillName: string
  pool: DicePool
  onClose: () => void
  /** Optional AP cost — shown as a hint in the footer; consumer wires the actual debit via onAfterRoll. */
  apCost?: number
  /** Pre-applied pool modifier (e.g. -3 for Dodge/Parry). */
  initialModifier?: number
  /** Weapon-specific trigger option names — resolved via lookupQuality in the result panel. */
  weaponTriggers?: string[]
  /** If true, show the rulebook "Combat Triggers" table in the result panel. */
  showCombatTriggers?: boolean
  /** Short tag rendered under the title, e.g. "Combat · Attack". */
  contextLabel?: string
  /** Fired after a successful roll persists. Use to debit AP or apply other side effects. */
  onAfterRoll?: (rollData: DiceRollData) => Promise<void> | void
  /** Current Edge available to the character. Edge buttons render only when both this and onSpendEdge are provided. */
  edgeAvailable?: number
  /** Decrement Edge by 1 — called whenever an Edge action commits (pool bonus on the first roll, or each "Spend edge: re-roll"). */
  onSpendEdge?: () => Promise<void> | void
  /** Pending pool-modifier bonuses carried on the character (Flow etc.) — auto-applied to this roll and consumed when it commits. */
  pendingBonuses?: PendingBonus[]
  /** Remove the given pending bonus IDs from the character — fired after a roll consumes them. */
  onConsumeBonuses?: (ids: string[]) => Promise<void> | void
  /** Persist a new pending bonus on the character (from a trigger option's Apply button). Returns the new bonus's id. */
  onApplyBonus?: (bonus: ApplyBonusInput) => string
  /** Remove a previously-applied pending bonus by id — used to un-apply within the trigger panel. */
  onRemoveBonus?: (id: string) => void
  /** Initial state for the "Hidden roll" checkbox. The GM can still untick
   * before rolling — this is purely the default. Set to true when rolling
   * for a hidden NPC. */
  defaultHidden?: boolean
}

export function DiceRoller({
  gameId,
  characterId,
  skillName,
  pool,
  onClose,
  apCost,
  initialModifier = 0,
  weaponTriggers,
  showCombatTriggers = false,
  contextLabel,
  onAfterRoll,
  edgeAvailable,
  onSpendEdge,
  pendingBonuses,
  onConsumeBonuses,
  onApplyBonus,
  onRemoveBonus,
  defaultHidden = false,
}: DiceRollerProps) {
  const [modifier, setModifier] = useState(initialModifier)
  const [hidden, setHidden] = useState(defaultHidden)
  const [rolling, setRolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiceRollData | null>(null)
  const [rollKey, setRollKey] = useState(0)
  // Track whether onAfterRoll has fired so re-rolls (e.g. spending Edge)
  // don't double-debit AP for the same combat action.
  const [afterRollFired, setAfterRollFired] = useState(false)
  // Edge pool bonus: reserved pre-roll, debited on the first roll. Once
  // debited, the bonus is locked in for any subsequent re-roll in the same
  // modal (you already paid for it).
  const [edgeBonusReserved, setEdgeBonusReserved] = useState(false)
  const [edgeBonusDebited, setEdgeBonusDebited] = useState(false)
  // Snapshot the pending bonuses at modal-open so we can keep displaying
  // them after the character row has them removed. Consume once on the
  // first roll; re-rolls in the same modal don't re-consume.
  const [appliedBonuses] = useState<PendingBonus[]>(() => pendingBonuses ?? [])
  // Bonuses the user opted out of for this roll. Skipped bonuses don't
  // contribute to the pool and aren't consumed on commit — they stay on
  // the character for next time.
  const [skippedBonusIds, setSkippedBonusIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [bonusesConsumed, setBonusesConsumed] = useState(false)
  const refreshFeed = useDiceFeedRefresh()
  const broadcastNewRoll = useDiceFeedBroadcast()

  const activeBonuses = appliedBonuses.filter((b) => !skippedBonusIds.has(b.id))
  const edgeEnabled = onSpendEdge != null && edgeAvailable != null
  const bonusModifierSum = activeBonuses.reduce((s, b) => s + b.modifier, 0)
  const effectiveModifier =
    modifier + (edgeBonusReserved ? 3 : 0) + bonusModifierSum
  const adjusted = useMemo(
    () => applyModifier(pool, effectiveModifier),
    [pool, effectiveModifier],
  )
  const showConfig = !result

  async function submit() {
    setRolling(true)
    setError(null)
    try {
      const row = await rollDice({
        data: {
          gameId,
          characterId,
          skillName,
          pool: {
            standard: adjusted.standard,
            aptitude: adjusted.aptitude,
            expertise: adjusted.expertise,
          },
          modifier: effectiveModifier,
          isHidden: hidden,
        },
      })
      const rollData = row.roll_data as unknown as DiceRollData
      setResult(rollData)
      setRollKey((k) => k + 1)
      await refreshFeed()
      broadcastNewRoll()
      if (edgeBonusReserved && !edgeBonusDebited && onSpendEdge) {
        setEdgeBonusDebited(true)
        try {
          await onSpendEdge()
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to spend edge')
        }
      }
      if (activeBonuses.length > 0 && !bonusesConsumed && onConsumeBonuses) {
        setBonusesConsumed(true)
        try {
          await onConsumeBonuses(activeBonuses.map((b) => b.id))
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to consume bonus')
        }
      }
      if (onAfterRoll && !afterRollFired) {
        // Fire-and-forget — surface errors via the modal's error slot but
        // never block the result view. Gated on afterRollFired so Edge
        // re-rolls in the same modal don't double-debit AP.
        setAfterRollFired(true)
        try {
          await onAfterRoll(rollData)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Post-roll action failed')
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Roll failed')
    } finally {
      setRolling(false)
    }
  }

  async function spendEdgeReroll() {
    if (!onSpendEdge || rolling) return
    if (edgeAvailable == null || edgeAvailable <= 0) return
    try {
      await onSpendEdge()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to spend edge')
      return
    }
    void submit()
  }

  const showApHint = apCost != null && apCost > 0 && !result
  const canReserveEdge =
    !result && (edgeBonusReserved || (edgeAvailable ?? 0) > 0)
  const canSpendEdgeReroll = !!result && !rolling && (edgeAvailable ?? 0) > 0

  return (
    <Modal
      onClose={onClose}
      size="sm"
      align="center"
      title={
        <>
          Roll: <span className="text-accent-900">{skillName}</span>
          {contextLabel && (
            <span className="ml-2 align-middle text-xs font-normal text-gray-700">
              {contextLabel}
            </span>
          )}
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={rolling}>
            {rolling || result ? 'Close' : 'Cancel'}
          </Button>
          {showApHint && (
            <span className="mr-1 self-center text-xs text-gray-700">
              Spends {apCost} AP
            </span>
          )}
          {result ? (
            edgeEnabled && (
              <Button
                onClick={spendEdgeReroll}
                disabled={!canSpendEdgeReroll}
                title={
                  (edgeAvailable ?? 0) <= 0
                    ? 'No edge points available'
                    : 'Spend 1 Edge to re-roll all dice'
                }
              >
                Re-roll (edge)
              </Button>
            )
          ) : (
            <Button onClick={submit} disabled={rolling || adjusted.total === 0}>
              {rolling ? 'Rolling…' : 'Roll'}
            </Button>
          )}
        </>
      }
    >
      {showConfig && (
        <>
          <div className="mb-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
              Pool
            </p>
            <div className="flex items-center gap-3">
              <DieCounter type="standard" count={adjusted.standard} size="sm" />
              {adjusted.aptitude > 0 && (
                <DieCounter
                  type="aptitude"
                  count={adjusted.aptitude}
                  size="sm"
                />
              )}
              {adjusted.expertise > 0 && (
                <DieCounter
                  type="expertise"
                  count={adjusted.expertise}
                  size="sm"
                />
              )}
              <span className="ml-2 text-sm text-gray-900">
                {adjusted.total} dice
              </span>
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
              Modifier
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setModifier((m) => m - 1)}
                aria-label="Decrease modifier"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition hover:bg-gray-500"
              >
                −
              </button>
              <span className="min-w-[3ch] text-center text-sm font-medium text-white">
                {modifier > 0 ? `+${modifier}` : modifier}
              </span>
              <button
                type="button"
                onClick={() => setModifier((m) => m + 1)}
                aria-label="Increase modifier"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition hover:bg-gray-500"
              >
                +
              </button>
              {modifier !== initialModifier && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModifier(initialModifier)}
                  className="ml-1"
                >
                  Reset
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-700">
              Negative reduces aptitude first, then expertise. Standard die is
              never modified.
            </p>
          </div>

          {appliedBonuses.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
                Pending bonuses
              </p>
              <div className="flex flex-wrap gap-1.5">
                {appliedBonuses.map((b) => {
                  const skipped = skippedBonusIds.has(b.id)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        setSkippedBonusIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(b.id)) next.delete(b.id)
                          else next.add(b.id)
                          return next
                        })
                      }
                      title={
                        skipped
                          ? `Click to apply (${b.source})`
                          : `Click to skip this roll (${b.source})`
                      }
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] transition ${
                        skipped
                          ? 'border-gray-400 bg-transparent text-gray-700'
                          : 'border-accent-700/60 bg-accent-700/15 text-accent-900 hover:bg-accent-700/25'
                      }`}
                    >
                      <span className="font-semibold tabular-nums">
                        {b.modifier > 0 ? `+${b.modifier}` : b.modifier}
                      </span>
                      <span>{b.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-xs text-gray-700">
                Applied bonuses are consumed when this roll commits. Click a
                chip to skip it for this roll — it stays on your character.
              </p>
            </div>
          )}

          {edgeEnabled && (
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant={edgeBonusReserved ? 'secondary' : 'subtle'}
                size="sm"
                onClick={() => setEdgeBonusReserved((v) => !v)}
                disabled={!canReserveEdge}
                title={
                  (edgeAvailable ?? 0) <= 0 && !edgeBonusReserved
                    ? 'No edge points available'
                    : 'Spend 1 Edge to add +3 to your pool for this roll'
                }
              >
                {edgeBonusReserved
                  ? '✓ Edge spent: +3 pool'
                  : 'Spend edge: +3 pool'}
              </Button>
              <span className="text-xs text-gray-700">
                Edge available: {edgeAvailable}
              </span>
            </div>
          )}

          <label className="mb-4 flex items-center gap-2 text-sm text-gray-1000">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="h-4 w-4"
            />
            Hidden roll (only you and the GM see the result)
          </label>
        </>
      )}

      {error && <p className="mb-3 text-sm text-danger-900">{error}</p>}

      {result && (
        <div key={rollKey} className="mb-4">
          <RollResultView
            data={result}
            weaponTriggers={weaponTriggers}
            showCombatTriggers={showCombatTriggers}
            onApplyBonus={onApplyBonus}
            onRemoveBonus={onRemoveBonus}
            currentBonuses={pendingBonuses}
          />
        </div>
      )}
    </Modal>
  )
}
