import { createPortal } from 'react-dom'
import type { Character } from '~/lib/types/domain'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import { seekInspirationEdgeCap } from '~/lib/game-logic/downtime'
import { Button } from '~/components/ui/Button'
import { useDowntimeFooterTarget } from './DowntimeModal'

interface Props {
  character: Character
  effects: AppliedPassiveEffects
  onCloseAll: () => void
  onUpdateField: <K extends keyof Character>(
    key: K,
    value: Character[K],
  ) => void
}

const EDGE_GRANT = 2

export function SeekInspiration({
  character,
  effects,
  onCloseAll,
  onUpdateField,
}: Props) {
  const footerEl = useDowntimeFooterTarget()
  const maxEdge = effects.derived.edge
  const cap = seekInspirationEdgeCap(maxEdge)
  const current = character.edge_current
  const next = Math.min(cap, current + EDGE_GRANT)
  const atCap = current >= cap

  function apply() {
    onUpdateField('edge_current', next)
    onCloseAll()
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
      </div>
      {footerEl &&
        createPortal(
          <Button
            onClick={apply}
            disabled={atCap}
            title={atCap ? 'Already at the +50% ceiling' : undefined}
          >
            Apply inspiration
          </Button>,
          footerEl,
        )}
    </div>
  )
}
