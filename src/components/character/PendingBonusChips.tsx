import type { PendingBonus } from '~/lib/types/database'

interface PendingBonusChipsProps {
  bonuses: PendingBonus[]
  canEdit: boolean
  /** Remove a single bonus by id — used by the X on each chip. */
  onRemove: (id: string) => void
  /** Optional compact mode for in-row use (combat compact row). Drops the label heading. */
  compact?: boolean
}

/**
 * Persistent pool-modifier chips ("+1 Flow", "−2 Note") rendered on the
 * character sheet's live-play band and on the combat-tracker participant
 * card. Each chip is the player's reminder that a modifier will auto-apply
 * to their next roll; the X removes it without rolling.
 */
export function PendingBonusChips({
  bonuses,
  canEdit,
  onRemove,
  compact = false,
}: PendingBonusChipsProps) {
  if (bonuses.length === 0) return null
  return (
    <div className={compact ? 'inline-flex flex-wrap gap-1' : 'space-y-1'}>
      {!compact && (
        <p className="text-[10px] uppercase tracking-wide text-gray-700">
          Pending bonuses
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {bonuses.map((b) => {
          const tone =
            b.modifier >= 0
              ? 'border-accent-700/60 bg-accent-700/15 text-accent-900'
              : 'border-danger-700/60 bg-danger-700/15 text-danger-900'
          return (
            <span
              key={b.id}
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${tone}`}
              title={`Persisted from ${b.source}. Removes on next roll.`}
            >
              <span className="font-semibold tabular-nums">
                {b.modifier > 0 ? `+${b.modifier}` : b.modifier}
              </span>
              <span>{b.label}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(b.id)}
                  className="-mr-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded text-gray-700 transition hover:bg-gray-200 hover:text-white"
                  aria-label={`Remove ${b.label}`}
                  title="Remove this bonus"
                >
                  ×
                </button>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
