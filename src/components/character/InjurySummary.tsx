import { Button } from '~/components/ui/Button'
import { Popover, usePopover } from '~/components/ui/Popover'
import { IconChevronDown, IconX } from '@tabler/icons-react'
import injuriesData from '~/data/injuries.json'
import { injuryEscalator, type InjuryDef } from '~/lib/game-logic/injuries'
import type { InjuryEntry } from '~/lib/types/database'

// Effect text isn't stored on the carried injury (we only denormalize the
// fields the rules engine needs). Look it back up from the catalog by name
// for the per-row tooltip and description.
const EFFECTS_BY_NAME = new Map(
  (injuriesData as InjuryDef[]).map((i) => [i.name, i.effect]),
)

interface InjurySummaryProps {
  injuries: InjuryEntry[]
  canEdit: boolean
  onTreat: (id: string, treated: boolean) => void
  onRemove: (id: string) => void
}

/**
 * Single-button summary of carried injuries. Hidden when none are present.
 * Click opens a popover with the full list and per-row Treat/Remove actions.
 * The button label surfaces the count plus the cumulative escalator — the
 * gameplay number worth seeing at a glance.
 */
export function InjurySummary({
  injuries,
  canEdit,
  onTreat,
  onRemove,
}: InjurySummaryProps) {
  const popover = usePopover()

  if (injuries.length === 0) return null

  const escalator = injuryEscalator(injuries)
  const countLabel = `${injuries.length} ${injuries.length === 1 ? 'injury' : 'injuries'}`

  return (
    <>
      <button
        ref={popover.refs.setReference}
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-danger-400 bg-danger-200 px-2 py-1 text-xs font-medium text-danger-900 transition hover:brightness-110"
        {...popover.getReferenceProps()}
      >
        <span>{countLabel}</span>
        {escalator > 0 && (
          <>
            <span className="text-danger-900/60">·</span>
            <span className="tabular-nums">+{escalator} dice</span>
          </>
        )}
        <IconChevronDown
          size={12}
          aria-hidden
          className={`transition-transform ${popover.open ? 'rotate-180' : ''}`}
        />
      </button>
      <Popover popover={popover} className="w-80 text-xs">
        <div className="shrink-0 border-b border-gray-400 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
          Carried injuries
        </div>
        <ul className="flex-1 divide-y divide-gray-400 overflow-y-auto">
          {injuries.map((injury) => (
            <li key={injury.id}>
              <InjuryRow
                injury={injury}
                canEdit={canEdit}
                onTreat={(t) => onTreat(injury.id, t)}
                onRemove={() => onRemove(injury.id)}
              />
            </li>
          ))}
        </ul>
        {escalator > 0 && (
          <div className="shrink-0 border-t border-gray-400 px-3 py-2 text-[11px] text-gray-900">
            Future injury rolls:{' '}
            <span className="font-semibold text-danger-900">
              +{escalator} {escalator === 1 ? 'die' : 'dice'}
            </span>
          </div>
        )}
      </Popover>
    </>
  )
}

interface InjuryRowProps {
  injury: InjuryEntry
  canEdit: boolean
  onTreat: (treated: boolean) => void
  onRemove: () => void
}

function InjuryRow({ injury, canEdit, onTreat, onRemove }: InjuryRowProps) {
  const effect = EFFECTS_BY_NAME.get(injury.name) ?? ''
  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold tabular-nums ${
            injury.treated
              ? 'bg-gray-300 text-gray-1000'
              : 'bg-danger-300 text-danger-1000'
          }`}
          title={`Severity ${injury.severity}`}
        >
          {injury.severity}
        </span>
        <span
          className={`min-w-0 flex-1 truncate ${injury.treated ? 'text-gray-900' : 'text-gray-1000'}`}
        >
          {injury.name}
          {injury.treated && (
            <span className="ml-1.5 text-[9px] uppercase tracking-wide text-gray-700">
              treated
            </span>
          )}
        </span>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onTreat(!injury.treated)}
            >
              {injury.treated ? 'Untreat' : 'Treat'}
            </Button>
            <Button
              variant="ghostDanger"
              size="xs"
              onClick={() => {
                if (window.confirm(`Remove ${injury.name}?`)) onRemove()
              }}
              aria-label={`Remove ${injury.name}`}
            >
              <IconX size={12} />
            </Button>
          </div>
        )}
      </div>
      {effect && (
        <p className="mt-1 ml-7 text-[11px] leading-snug text-gray-900">
          {effect}
        </p>
      )}
    </div>
  )
}
