import type { CharacterAttributes } from '~/lib/types/database'
import {
  ATTRIBUTE_DEFINITIONS,
  MAX_ATTRIBUTE_LEVEL,
} from '~/lib/game-logic/attributes'
import type { AttributeId } from '~/lib/game-logic/attributes'

interface AttributesPanelProps {
  attributes: CharacterAttributes
  canEdit: boolean
  onAttributeChange: (attrId: AttributeId, value: number) => void
}

/**
 * Edit-form attribute panel for a fully-created character. Only the global
 * hard cap (`MAX_ATTRIBUTE_LEVEL`) applies here — the creation-time
 * 28-point budget and the 6/4 caps are enforced by the creation wizard,
 * not by this view.
 */
export function AttributesPanel({
  attributes,
  canEdit,
  onAttributeChange,
}: AttributesPanelProps) {
  return (
    <div className="rounded-xl border border-void-600 bg-void-800 p-3">
      <div className="grid grid-cols-7 gap-2">
        {ATTRIBUTE_DEFINITIONS.map((attr) => {
          const value = attributes[attr.id]
          return (
            <div
              key={attr.id}
              className="flex flex-col items-center rounded-lg border border-void-600 bg-void-700 px-1 py-2"
              title={attr.name}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {attr.abbr}
              </span>
              <span className="my-1 text-2xl font-bold leading-none text-white">
                {value}
              </span>
              {canEdit && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onAttributeChange(attr.id, value - 1)}
                    disabled={value <= 0}
                    aria-label={`Decrease ${attr.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded bg-void-600 text-xs text-gray-300 transition hover:bg-void-500 disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    onClick={() => onAttributeChange(attr.id, value + 1)}
                    disabled={value >= MAX_ATTRIBUTE_LEVEL}
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
