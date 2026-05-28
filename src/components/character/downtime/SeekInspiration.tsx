import { useState } from 'react'
import type { Character } from '~/lib/types/database'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import { seekInspirationEdgeCap } from '~/lib/game-logic/downtime'
import { Button } from '~/components/ui/Button'

interface Props {
  character: Character
  effects: AppliedPassiveEffects
  onUpdateField: <K extends keyof Character>(
    key: K,
    value: Character[K],
  ) => void
}

const EDGE_GRANT = 2

export function SeekInspiration({ character, effects, onUpdateField }: Props) {
  const [applied, setApplied] = useState(false)
  const maxEdge = effects.derived.edge
  const cap = seekInspirationEdgeCap(maxEdge)
  const current = character.edge_current
  const next = Math.min(cap, current + EDGE_GRANT)
  const actualGain = next - current
  const atCap = current >= cap

  function apply() {
    onUpdateField('edge_current', next)
    setApplied(true)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-1000">
        Gain <span className="font-semibold text-white">+{EDGE_GRANT}</span>{' '}
        Edge — even beyond your usual limit of {maxEdge}, capped at 150% ({cap}
        ).
      </p>
      <div className="rounded-lg border border-gray-400 bg-background-100 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-900">Edge</span>
          <span className="tabular-nums text-white">
            {current} → {next} / {cap}
          </span>
        </div>
        {maxEdge !== cap && (
          <p className="mt-1 text-xs text-gray-700">
            Normal limit {maxEdge}; surplus carries into the next adventure.
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        {applied && (
          <span className="text-xs text-accent-900">
            ✓ Gained {actualGain} edge
          </span>
        )}
        <Button
          onClick={apply}
          disabled={applied || atCap}
          title={atCap ? 'Already at the +50% ceiling' : undefined}
        >
          {applied ? 'Applied' : 'Apply inspiration'}
        </Button>
      </div>
    </div>
  )
}
