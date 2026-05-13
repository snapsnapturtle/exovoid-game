import type { CharacterAttributes } from '~/lib/types/database'
import {
  ATTRIBUTE_DEFINITIONS,
  MAX_ATTRIBUTE_LEVEL,
} from '~/lib/game-logic/attributes'
import type { AttributeId } from '~/lib/game-logic/attributes'
import type { Contribution } from '~/lib/game-logic/passive-effects'

interface AttributesPanelProps {
  attributes: CharacterAttributes
  effectiveAttributes: CharacterAttributes
  contributions: Partial<Record<AttributeId, Contribution[]>>
  canEdit: boolean
  onAttributeChange: (attrId: AttributeId, value: number) => void
}

/**
 * Edit-form attribute panel for a fully-created character. The +/- buttons
 * always edit the stored base value; the displayed number is the base plus
 * any passive bonuses from talents or cyberware (clamped to MAX_ATTRIBUTE_LEVEL).
 */
export function AttributesPanel({
  attributes,
  effectiveAttributes,
  contributions,
  canEdit,
  onAttributeChange,
}: AttributesPanelProps) {
  return (
    <div className="rounded-xl border border-void-600 bg-void-800 p-3">
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
              className="flex flex-col items-center rounded-lg border border-void-600 bg-void-700 px-1 py-2"
              title={tooltip}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {attr.abbr}
              </span>
              <span className="my-1 text-2xl font-bold leading-none text-white">
                {effective}
              </span>
              {bonuses.length > 0 && canEdit && (
                <span className="text-[10px] leading-none text-accent-400">
                  base {base}
                </span>
              )}
              {canEdit && (
                <div className="mt-1 flex gap-1">
                  <button
                    onClick={() => onAttributeChange(attr.id, base - 1)}
                    disabled={base <= 0}
                    aria-label={`Decrease ${attr.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded bg-void-600 text-xs text-gray-300 transition hover:bg-void-500 disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    onClick={() => onAttributeChange(attr.id, base + 1)}
                    disabled={base >= MAX_ATTRIBUTE_LEVEL}
                    aria-label={`Increase ${attr.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded bg-void-600 text-xs text-gray-300 transition hover:bg-void-500 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
