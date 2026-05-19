import type { NodeState } from './TalentNode'
import type { PassiveEffect } from '~/lib/game-logic/passive-effects'
import { ATTRIBUTE_DEFINITIONS } from '~/lib/game-logic/attributes'
import { Button } from '~/components/ui/Button'

const DERIVED_STAT_LABEL: Record<string, string> = {
  health: 'max Health',
  vigilance: 'Vigilance',
  heft: 'Heft',
  edge: 'max Edge',
  actionPoints: 'Action Points',
  speed: 'Speed',
  cyberImmunity: 'Cyber Immunity',
  soak: 'Soak',
}

function formatEffect(eff: PassiveEffect): string {
  const sign = eff.value >= 0 ? '+' : ''
  if (eff.kind === 'attribute') {
    const attr = ATTRIBUTE_DEFINITIONS.find((a) => a.id === eff.attr)
    return `${sign}${eff.value} ${attr?.name ?? eff.attr}`
  }
  return `${sign}${eff.value} ${DERIVED_STAT_LABEL[eff.stat] ?? eff.stat}`
}

interface TalentDetailRailProps {
  name: string | null
  description: string | null
  tier: number | null
  career: string | null
  granted: boolean
  effects?: PassiveEffect[]
  state: NodeState | null
  reason?: string
  canEdit: boolean
  onUnlock: () => void
  onRemove: () => void
  busy: boolean
}

export function TalentDetailRail({
  name,
  description,
  tier,
  career,
  granted,
  effects,
  state,
  reason,
  canEdit,
  onUnlock,
  onRemove,
  busy,
}: TalentDetailRailProps) {
  if (!name) {
    return (
      <div className="rounded-xl border border-gray-400 bg-background-200 p-6 text-sm text-gray-700">
        Select a talent to see its details.
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-400 bg-background-200 p-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-700">
          {granted ? (
            <span className="text-accent-900">Granted</span>
          ) : (
            <>
              {career} · Tier {tier}
            </>
          )}
        </div>
        <h3 className="mt-1 text-xl font-bold text-white">{name}</h3>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-1000">
        {description}
      </p>

      {effects && effects.length > 0 && (
        <div className="rounded-lg border border-accent-700/40 bg-accent-700/5 p-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-accent-900">
            Auto-applied
          </div>
          <ul className="space-y-0.5 text-sm text-white">
            {effects.map((eff, i) => (
              <li key={i}>{formatEffect(eff)}</li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && state && (
        <div className="border-t border-gray-400 pt-4">
          {state === 'owned' ? (
            <Button variant="danger" onClick={onRemove} disabled={busy}>
              {busy ? 'Removing…' : 'Remove talent'}
            </Button>
          ) : state === 'available' ? (
            <Button onClick={onUnlock} disabled={busy}>
              {busy ? 'Unlocking…' : 'Unlock for 1 point'}
            </Button>
          ) : (
            <div className="text-sm text-gray-700">{reason ?? 'Locked.'}</div>
          )}
        </div>
      )}
    </div>
  )
}
