import { useMemo, useState } from 'react'
import { DieCounter } from './Die'
import { rollDice, type DiceRollData } from '~/lib/server/dice'
import { applyModifier, type DicePool } from '~/lib/game-logic/dice'
import {
  useDiceFeedBroadcast,
  useDiceFeedRefresh,
} from '~/lib/hooks/diceFeedContext'
import { RollResultView } from './RollResultView'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'

interface DiceRollerProps {
  gameId: string
  characterId: string | null
  skillName: string
  pool: DicePool
  onClose: () => void
}

export function DiceRoller({
  gameId,
  characterId,
  skillName,
  pool,
  onClose,
}: DiceRollerProps) {
  const [modifier, setModifier] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiceRollData | null>(null)
  const [rollKey, setRollKey] = useState(0)
  const refreshFeed = useDiceFeedRefresh()
  const broadcastNewRoll = useDiceFeedBroadcast()

  const adjusted = useMemo(
    () => applyModifier(pool, modifier),
    [pool, modifier],
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
          modifier,
          isHidden: hidden,
        },
      })
      setResult(row.roll_data as unknown as DiceRollData)
      setRollKey((k) => k + 1)
      await refreshFeed()
      broadcastNewRoll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Roll failed')
    } finally {
      setRolling(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      size="sm"
      align="center"
      title={
        <>
          Roll: <span className="text-accent-900">{skillName}</span>
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={rolling}>
            {rolling || result ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={submit} disabled={rolling || adjusted.total === 0}>
            {rolling ? 'Rolling…' : result ? 'Re-roll' : 'Roll'}
          </Button>
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
              {modifier !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModifier(0)}
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
          <RollResultView data={result} />
        </div>
      )}
    </Modal>
  )
}
