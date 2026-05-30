import { useMemo, useState } from 'react'
import { Modal } from '~/components/ui/Modal'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { Input } from '~/components/ui/Input'
import { RollResultView } from '~/components/dice/RollResultView'
import { rollDice, type DiceRollData } from '~/lib/server/dice'
import {
  useDiceFeedBroadcast,
  useDiceFeedRefresh,
} from '~/lib/hooks/diceFeedContext'
import {
  injuryEscalator,
  makeInjuryEntry,
  pickInjury,
  type InjuryDef,
} from '~/lib/game-logic/injuries'
import type { InjuryEntry } from '~/lib/types/database'

interface RollForInjuryModalProps {
  gameId: string
  characterId: string
  currentInjuries: InjuryEntry[]
  edgeCurrent: number
  /** Minion target: count `minion` injury-die faces as wounds. Drops fast
   * on light hits. (Rulebook treats `minion` as a wound symbol only when
   * the target is a minion — for normal targets it's a miss.) */
  isMinion?: boolean
  /** Insert the dice_rolls row with `is_hidden=true`. Set when rolling for
   * a hidden NPC so the roll's existence doesn't leak through the feed. */
  isHidden?: boolean
  onApply: (injury: InjuryEntry | null, adrenalineToAdd: number) => void
  onClose: () => void
}

interface InjuryRoll {
  data: DiceRollData
  adrenalineCount: number
  cyberwareCount: number
  drawn: InjuryDef | null
}

export function RollForInjuryModal({
  gameId,
  characterId,
  currentInjuries,
  edgeCurrent,
  isMinion = false,
  isHidden = false,
  onApply,
  onClose,
}: RollForInjuryModalProps) {
  const [damage, setDamage] = useState(1)
  const [roll, setRoll] = useState<InjuryRoll | null>(null)
  const [rollKey, setRollKey] = useState(0)
  const [adrenalineKept, setAdrenalineKept] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshFeed = useDiceFeedRefresh()
  const broadcastNewRoll = useDiceFeedBroadcast()

  const escalator = useMemo(
    () => injuryEscalator(currentInjuries),
    [currentInjuries],
  )
  const totalDice = Math.max(0, damage) + escalator

  async function executeRoll() {
    if (totalDice < 1 || rolling) return
    setRolling(true)
    setError(null)
    try {
      const row = await rollDice({
        data: {
          gameId,
          characterId,
          skillName: 'Injury roll',
          pool: { injury: totalDice },
          isHidden,
        },
      })
      const data = row.roll_data as unknown as DiceRollData
      const summary = data.summary ?? {}
      const minionCount = summary.minion ?? 0
      const woundCount = (summary.wound ?? 0) + (isMinion ? minionCount : 0)
      const adrenalineCount = summary.adrenaline ?? 0
      const cyberwareCount = summary.cyberware ?? 0
      const drawn = pickInjury(woundCount)
      setRoll({ data, adrenalineCount, cyberwareCount, drawn })
      setRollKey((k) => k + 1)
      setAdrenalineKept(adrenalineCount)
      await refreshFeed()
      broadcastNewRoll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Roll failed')
    } finally {
      setRolling(false)
    }
  }

  function apply() {
    const newInjury = roll?.drawn ? makeInjuryEntry(roll.drawn) : null
    onApply(newInjury, adrenalineKept)
    onClose()
  }

  return (
    <Modal
      onClose={onClose}
      size="sm"
      align="center"
      title="Roll for injury"
      footer={
        roll ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost" onClick={executeRoll} disabled={rolling}>
              {rolling ? 'Rolling…' : 'Re-roll'}
            </Button>
            <Button onClick={apply} disabled={rolling}>
              {roll.drawn || adrenalineKept > 0 ? 'Apply' : 'Close'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={rolling}>
              Cancel
            </Button>
            <Button onClick={executeRoll} disabled={rolling || totalDice < 1}>
              {rolling
                ? 'Rolling…'
                : `Roll ${totalDice} ${totalDice === 1 ? 'die' : 'dice'}`}
            </Button>
          </>
        )
      }
    >
      {!roll && (
        <>
          <div className="mb-4">
            <label
              htmlFor="injury-damage"
              className="mb-2 block text-xs uppercase tracking-wide text-gray-700"
            >
              Damage past zero
            </label>
            <Input
              id="injury-damage"
              type="number"
              min={1}
              value={damage}
              onChange={(e) =>
                setDamage(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="w-full"
            />
            <p className="mt-1.5 text-xs text-gray-700">
              Damage that overflows below 0 health. Roll this many injury dice.
            </p>
          </div>

          {escalator > 0 && (
            <Alert variant="warning" className="mb-4">
              Existing injuries add{' '}
              <span className="font-semibold">+{escalator}</span> injury{' '}
              {escalator === 1 ? 'die' : 'dice'} to this roll. Total:{' '}
              <span className="font-semibold">{totalDice}</span>.
            </Alert>
          )}
        </>
      )}

      {error && <Alert className="mb-3">{error}</Alert>}

      {roll && (
        <div key={rollKey}>
          <RollResultView data={roll.data} />

          <div className="mt-5 space-y-3">
            {roll.drawn ? (
              <div className="rounded-lg border border-danger-400 bg-danger-200 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-base font-semibold text-danger-1000">
                    {roll.drawn.name}
                  </h4>
                  <span className="text-xs uppercase tracking-wide text-danger-900">
                    Severity {roll.drawn.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-danger-900">
                  {roll.drawn.effect}
                </p>
                {roll.drawn.modifier > 0 && (
                  <p className="mt-2 text-xs text-danger-900">
                    Adds{' '}
                    <span className="font-semibold">
                      +{roll.drawn.modifier}
                    </span>{' '}
                    {roll.drawn.modifier === 1 ? 'die' : 'dice'} to future
                    injury rolls.
                  </p>
                )}
              </div>
            ) : (
              <Alert variant="success">
                No wound symbols rolled — no injury suffered.
              </Alert>
            )}

            {roll.adrenalineCount > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-pink-400 bg-pink-200 px-3 py-2 text-sm text-pink-900">
                <span>
                  <span className="font-semibold">
                    +{roll.adrenalineCount} Edge
                  </span>{' '}
                  from adrenaline.
                </span>
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={adrenalineKept === roll.adrenalineCount}
                    onChange={(e) =>
                      setAdrenalineKept(
                        e.target.checked ? roll.adrenalineCount : 0,
                      )
                    }
                    className="h-4 w-4"
                  />
                  Apply ({edgeCurrent} → {edgeCurrent + adrenalineKept})
                </label>
              </div>
            )}

            {roll.cyberwareCount > 0 && (
              <Alert variant="warning">
                {roll.cyberwareCount} cyberware{' '}
                {roll.cyberwareCount === 1 ? 'symbol' : 'symbols'} rolled — if
                you're over your Cyber Immunity, roll 2d20 on the malfunction
                table{' '}
                {roll.cyberwareCount === 1
                  ? 'once'
                  : `${roll.cyberwareCount} times`}
                .
              </Alert>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
