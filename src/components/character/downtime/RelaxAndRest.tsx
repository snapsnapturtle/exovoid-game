import { useState } from 'react'
import type { Character } from '~/lib/types/database'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import { relaxAndRestHealAmount } from '~/lib/game-logic/downtime'
import { Button } from '~/components/ui/Button'

interface Props {
  character: Character
  effects: AppliedPassiveEffects
  onUpdateField: <K extends keyof Character>(
    key: K,
    value: Character[K],
  ) => void
}

export function RelaxAndRest({ character, effects, onUpdateField }: Props) {
  const [applied, setApplied] = useState(false)
  const maxHealth = effects.derived.health
  const current = character.health_current ?? maxHealth
  const bump = relaxAndRestHealAmount(maxHealth)
  const next = Math.min(maxHealth, current + bump)
  const actualGain = next - current
  const alreadyFull = current >= maxHealth

  function apply() {
    onUpdateField('health_current', next)
    setApplied(true)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-1000">
        Restore <span className="font-semibold text-white">+{bump}</span> health
        ({Math.round(0.2 * 100)}% of your maximum of {maxHealth}, rounded up).
      </p>
      <div className="rounded-lg border border-gray-400 bg-background-100 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-900">Health</span>
          <span className="tabular-nums text-white">
            {current} → {next} / {maxHealth}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-700">
        Reminder: while resting, you also gain +3 pool on your nightly rest —
        apply that at the table when it comes up.
      </p>
      <div className="flex items-center justify-end gap-2">
        {applied && (
          <span className="text-xs text-accent-900">
            ✓ Restored {actualGain} health
          </span>
        )}
        <Button
          onClick={apply}
          disabled={applied || alreadyFull}
          title={alreadyFull ? 'Already at full health' : undefined}
        >
          {applied ? 'Applied' : 'Apply rest'}
        </Button>
      </div>
    </div>
  )
}
