import type { PendingBonus } from '~/lib/types/database'
import { Badge } from '~/components/ui/Badge'

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
        {bonuses.map((b) => (
          <Badge
            key={b.id}
            tone={b.modifier >= 0 ? 'success' : 'danger'}
            title={`Persisted from ${b.source}. Removes on next roll.`}
            dismissLabel={canEdit ? `Remove ${b.label}` : undefined}
            onDismiss={canEdit ? () => onRemove(b.id) : undefined}
          >
            <span className="font-semibold tabular-nums">
              {b.modifier > 0 ? `+${b.modifier}` : b.modifier}
            </span>
            <span>{b.label}</span>
          </Badge>
        ))}
      </div>
    </div>
  )
}
