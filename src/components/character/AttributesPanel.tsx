import type { CharacterAttributes } from '~/lib/types/database'
import {
  ATTRIBUTE_DEFINITIONS,
  remainingAttributePoints,
  MAX_ATTRIBUTE_LEVEL,
} from '~/lib/game-logic/attributes'
import type { AttributeId } from '~/lib/game-logic/attributes'

interface AttributesPanelProps {
  attributes: CharacterAttributes
  canEdit: boolean
  onAttributeChange: (attrId: AttributeId, value: number) => void
}

export function AttributesPanel({
  attributes,
  canEdit,
  onAttributeChange,
}: AttributesPanelProps) {
  const remaining = remainingAttributePoints(attributes)

  return (
    <div className="rounded-xl border border-void-600 bg-void-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Attributes</h3>
        <span
          className={`text-sm font-medium ${remaining === 0 ? 'text-success-400' : remaining < 0 ? 'text-danger-400' : 'text-warning-400'}`}
        >
          {remaining} points remaining
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {ATTRIBUTE_DEFINITIONS.map((attr) => {
          const value = attributes[attr.id]
          return (
            <div
              key={attr.id}
              className="flex flex-col items-center rounded-lg border border-void-600 bg-void-700 p-3"
            >
              <span className="mb-1 text-xs font-medium text-gray-400">
                {attr.abbr}
              </span>
              <span className="mb-2 text-2xl font-bold text-white">
                {value}
              </span>
              {canEdit && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onAttributeChange(attr.id, value - 1)}
                    disabled={value <= 0}
                    className="flex h-7 w-7 items-center justify-center rounded bg-void-600 text-sm text-gray-300 transition hover:bg-void-500 disabled:opacity-30"
                  >
                    -
                  </button>
                  <button
                    onClick={() => onAttributeChange(attr.id, value + 1)}
                    disabled={value >= MAX_ATTRIBUTE_LEVEL || remaining <= 0}
                    className="flex h-7 w-7 items-center justify-center rounded bg-void-600 text-sm text-gray-300 transition hover:bg-void-500 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              )}
              <span className="mt-1 text-center text-[10px] leading-tight text-gray-500">
                {attr.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
