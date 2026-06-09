import type { ReactNode } from 'react'

/**
 * A compact "Label: value" stat, used in the add-item modals' selection cards
 * (weapon/manufacturer/catalog) to show cost, rarity, mod slots, etc. on a
 * wrapping row. The label is subdued; the value is the brighter gray-1000.
 */
export function Stat({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <span>
      <span className="text-gray-700">{label}:</span>{' '}
      <span className="text-gray-1000">{children}</span>
    </span>
  )
}
