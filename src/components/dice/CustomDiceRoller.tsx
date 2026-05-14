import { useState } from 'react'
import { DieCounter } from './Die'
import { rollDice, type DiceRollData } from '~/lib/server/dice'
import type { DieType } from '~/lib/game-logic/dice'
import {
  useDiceFeedBroadcast,
  useDiceFeedRefresh,
} from '~/lib/hooks/diceFeedContext'
import { RollResultView } from './RollResultView'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'

const DICE: { type: DieType; label: string }[] = [
  { type: 'standard', label: 'Standard' },
  { type: 'aptitude', label: 'Aptitude' },
  { type: 'expertise', label: 'Expertise' },
  { type: 'injury', label: 'Injury' },
]

interface CustomDiceRollerProps {
  gameId: string
  characters: { id: string; name: string }[]
  isGm: boolean
  onClose: () => void
}

/**
 * Free-form roll: pick any combination of dice and give it a name.
 * Inspired by the reference Exovoid app's NPC action UI — pick aptitude/
 * expertise (and here also standard / injury) counts directly.
 */
export function CustomDiceRoller({
  gameId,
  characters,
  isGm,
  onClose,
}: CustomDiceRollerProps) {
  const [name, setName] = useState('')
  const [characterId, setCharacterId] = useState<string | null>(
    characters[0]?.id ?? null,
  )
  const [pool, setPool] = useState<Record<DieType, number>>({
    standard: 0,
    aptitude: 0,
    expertise: 0,
    injury: 0,
  })
  const [hidden, setHidden] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiceRollData | null>(null)
  const [rollKey, setRollKey] = useState(0)
  const refreshFeed = useDiceFeedRefresh()
  const broadcastNewRoll = useDiceFeedBroadcast()

  const total = pool.standard + pool.aptitude + pool.expertise + pool.injury
  const trimmedName = name.trim()
  const canRoll = total > 0
  const showConfig = !result

  function adjust(type: DieType, delta: number) {
    setPool((p) => ({ ...p, [type]: Math.max(0, p[type] + delta) }))
  }

  async function submit() {
    if (!canRoll) return
    setRolling(true)
    setError(null)
    try {
      const row = await rollDice({
        data: {
          gameId,
          characterId,
          skillName: trimmedName || 'Custom roll',
          pool,
          modifier: 0,
          isHidden: isGm && hidden,
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
          Custom Roll
          {!showConfig && trimmedName && (
            <span className="text-accent-400">: {trimmedName}</span>
          )}
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={rolling}>
            {rolling || result ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={submit} disabled={!canRoll || rolling}>
            {rolling ? 'Rolling…' : result ? 'Roll Again' : 'Roll'}
          </Button>
        </>
      }
    >

        {showConfig && (
          <>
            <div className="mb-4">
              <label
                htmlFor="custom-roll-name"
                className="mb-1 block text-xs uppercase tracking-wide text-gray-500"
              >
                Name
              </label>
              <input
                id="custom-roll-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Notice check"
                className="w-full rounded-lg border border-void-600 bg-void-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
              />
            </div>

            {characters.length > 1 && (
              <div className="mb-4">
                <label
                  htmlFor="custom-roll-character"
                  className="mb-1 block text-xs uppercase tracking-wide text-gray-500"
                >
                  Rolling as
                </label>
                <select
                  id="custom-roll-character"
                  value={characterId ?? ''}
                  onChange={(e) => setCharacterId(e.target.value || null)}
                  className="w-full rounded-lg border border-void-600 bg-void-700 px-3 py-1.5 text-sm text-white focus:border-accent-400 focus:outline-none"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                Dice
              </p>
              <div className="space-y-2">
                {DICE.map(({ type, label }) => (
                  <div key={type} className="flex items-center gap-3">
                    <DieCounter type={type} count={pool[type]} size="sm" />
                    <span className="flex-1 text-sm capitalize text-gray-300">
                      {label}
                    </span>
                    <button
                      onClick={() => adjust(type, -1)}
                      disabled={pool[type] === 0}
                      aria-label={`Decrease ${label}`}
                      className="flex h-7 w-7 items-center justify-center rounded bg-void-600 text-base text-gray-200 transition hover:bg-void-500 disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center text-sm font-medium text-white">
                      {pool[type]}
                    </span>
                    <button
                      onClick={() => adjust(type, +1)}
                      aria-label={`Increase ${label}`}
                      className="flex h-7 w-7 items-center justify-center rounded bg-void-600 text-base text-gray-200 transition hover:bg-void-500"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {isGm && (
              <label className="mb-4 flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={hidden}
                  onChange={(e) => setHidden(e.target.checked)}
                  className="h-4 w-4"
                />
                Hidden roll (only you see the result)
              </label>
            )}
          </>
        )}

        {error && <p className="mb-3 text-sm text-danger-400">{error}</p>}

        {result && (
          <div key={rollKey} className="mb-4">
            <RollResultView data={result} />
          </div>
        )}

    </Modal>
  )
}
