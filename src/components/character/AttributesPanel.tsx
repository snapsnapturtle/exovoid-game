import type { CharacterAttributes } from '~/lib/types/domain'
import { ATTRIBUTE_DEFINITIONS } from '~/lib/game-logic/attributes'
import type { AttributeId } from '~/lib/game-logic/attributes'
import type { Contribution } from '~/lib/game-logic/passive-effects'

interface AttributesPanelProps {
  attributes: CharacterAttributes
  effectiveAttributes: CharacterAttributes
  contributions: Partial<Record<AttributeId, Contribution[]>>
}

/**
 * Read-only attribute display. Attribute base values are owned by
 * character creation + level-up wizard's "Training: <Attribute>" talents
 * — there's no direct-edit affordance on the sheet. The breakdown
 * (base + passive bonuses = effective) is surfaced via the per-box
 * tooltip when bonuses are present.
 */
export function AttributesPanel({
  attributes,
  effectiveAttributes,
  contributions,
}: AttributesPanelProps) {
  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-3">
      <div className="grid grid-cols-7 gap-2">
        {ATTRIBUTE_DEFINITIONS.map((attr) => {
          const base = attributes[attr.id]
          const effective = effectiveAttributes[attr.id]
          const bonuses = contributions[attr.id] ?? []
          const tooltip =
            bonuses.length > 0
              ? `${attr.name}: base ${base}${bonuses.map((b) => ` ${b.value >= 0 ? '+' : ''}${b.value} ${b.source}`).join('')} = ${effective}`
              : attr.name
          return (
            <div
              key={attr.id}
              className="flex flex-col items-center rounded-lg border border-gray-400 px-1 py-2"
              title={tooltip}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-900">
                {attr.abbr}
              </span>
              <span className="mt-2 text-2xl font-bold leading-none text-white">
                {effective}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
