import { useState } from 'react'
import { DieCounter } from './Die'
import { rollDice, rollPolyDice, type DiceRollData } from '~/lib/server/dice'
import {
  POLY_DIE_ORDER,
  type DieType,
  type PolyDieType,
} from '~/lib/game-logic/dice'
import {
  useDiceFeedBroadcast,
  useDiceFeedRefresh,
} from '~/lib/hooks/diceFeedContext'
import { RollResultView } from './RollResultView'
import { Button } from '~/components/ui/Button'
import { Checkbox } from '~/components/ui/Checkbox'
import { InlineStepper } from '~/components/ui/InlineStepper'
import { Modal } from '~/components/ui/Modal'
import { Input, Select } from '~/components/ui/Input'
import { SegmentedControl } from '~/components/ui/SegmentedControl'

const DICE: { type: DieType; label: string }[] = [
  { type: 'standard', label: 'Standard' },
  { type: 'aptitude', label: 'Aptitude' },
  { type: 'expertise', label: 'Expertise' },
  { type: 'injury', label: 'Injury' },
]

type RollMode = 'exovoid' | 'standard'

const EMPTY_POLY_POOL: Record<PolyDieType, number> = {
  d4: 0,
  d6: 0,
  d8: 0,
  d10: 0,
  d12: 0,
  d20: 0,
  d100: 0,
}

interface CustomDiceRollerProps {
  gameId: string
  characters: { id: string; name: string }[]
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
  onClose,
}: CustomDiceRollerProps) {
  const [mode, setMode] = useState<RollMode>('exovoid')
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
  const [polyPool, setPolyPool] =
    useState<Record<PolyDieType, number>>(EMPTY_POLY_POOL)
  const [hidden, setHidden] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DiceRollData | null>(null)
  const [rollKey, setRollKey] = useState(0)
  const refreshFeed = useDiceFeedRefresh()
  const broadcastNewRoll = useDiceFeedBroadcast()

  const exovoidTotal =
    pool.standard + pool.aptitude + pool.expertise + pool.injury
  const polyTotal = POLY_DIE_ORDER.reduce((sum, t) => sum + polyPool[t], 0)
  const trimmedName = name.trim()
  const canRoll = mode === 'exovoid' ? exovoidTotal > 0 : polyTotal > 0
  const showConfig = !result

  function adjust(type: DieType, delta: number) {
    setPool((p) => ({ ...p, [type]: Math.max(0, p[type] + delta) }))
  }

  function adjustPoly(type: PolyDieType, delta: number) {
    setPolyPool((p) => ({ ...p, [type]: Math.max(0, p[type] + delta) }))
  }

  async function submit() {
    if (!canRoll) return
    setRolling(true)
    setError(null)
    try {
      const row =
        mode === 'exovoid'
          ? await rollDice({
              data: {
                gameId,
                characterId,
                skillName: trimmedName || 'Custom roll',
                pool,
                modifier: 0,
                isHidden: hidden,
              },
            })
          : await rollPolyDice({
              data: {
                gameId,
                characterId,
                skillName: trimmedName || 'Custom roll',
                pool: polyPool,
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
          Custom Roll
          {!showConfig && trimmedName && (
            <span className="text-accent-900">: {trimmedName}</span>
          )}
        </>
      }
      footerLeft={
        showConfig ? (
          <Checkbox
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
            label="Hidden roll"
            title="Only you and the GM see the result"
          />
        ) : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={rolling}>
            {rolling || result ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={submit} disabled={!canRoll || rolling}>
            {rolling ? 'Rolling…' : result ? 'Re-roll' : 'Roll'}
          </Button>
        </>
      }
    >
      {showConfig && (
        <>
          <SegmentedControl
            size="sm"
            className="mb-4"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'exovoid', label: 'Exovoid' },
              { value: 'standard', label: 'Standard' },
            ]}
          />

          <div className="mb-4">
            <label
              htmlFor="custom-roll-name"
              className="mb-1 block text-xs uppercase tracking-wide text-gray-700"
            >
              Name
            </label>
            <Input
              id="custom-roll-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Notice check"
              className="w-full"
            />
          </div>

          {characters.length > 1 && (
            <div className="mb-4">
              <label
                htmlFor="custom-roll-character"
                className="mb-1 block text-xs uppercase tracking-wide text-gray-700"
              >
                Rolling as
              </label>
              <Select
                id="custom-roll-character"
                value={characterId ?? ''}
                onChange={(e) => setCharacterId(e.target.value || null)}
                className="w-full"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="mb-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
              Dice
            </p>
            {mode === 'exovoid' ? (
              <div className="space-y-2">
                {DICE.map(({ type, label }) => (
                  <div key={type} className="flex items-center gap-3">
                    <DieCounter type={type} count={pool[type]} size="sm" />
                    <span className="flex-1 text-sm capitalize text-gray-1000">
                      {label}
                    </span>
                    <InlineStepper
                      value={pool[type]}
                      min={0}
                      ariaLabel={label}
                      onAdjust={(d) => adjust(type, d)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {POLY_DIE_ORDER.map((type) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-gray-1000">
                      {type}
                    </span>
                    <InlineStepper
                      value={polyPool[type]}
                      min={0}
                      ariaLabel={type}
                      onAdjust={(d) => adjustPoly(type, d)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
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
