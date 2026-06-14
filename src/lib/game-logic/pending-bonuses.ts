import type { PendingBonus } from '~/lib/types/domain'

/**
 * Build a fresh PendingBonus from a trigger option's bonus payload — stamps a
 * new UUID and an ISO timestamp. The input is intentionally structural (just
 * the persisted fields) so game-logic stays free of any component import.
 */
export function makePendingBonus(input: {
  label: string
  modifier: number
  source: string
}): PendingBonus {
  return {
    id: crypto.randomUUID(),
    label: input.label,
    modifier: input.modifier,
    source: input.source,
    addedAt: new Date().toISOString(),
  }
}
