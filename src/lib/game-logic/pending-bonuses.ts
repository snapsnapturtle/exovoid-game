import type { PendingBonus } from '~/lib/types/domain'

/**
 * The fields needed to mint a PendingBonus. Structural on purpose — any
 * superset (e.g. a trigger option's `bonus`, which also carries `stackable`)
 * is assignable, and game-logic / hooks stay free of any component import.
 */
export type PendingBonusInput = {
  label: string
  modifier: number
  source: string
}

/**
 * Build a fresh PendingBonus from a trigger option's bonus payload — stamps a
 * new UUID and an ISO timestamp.
 */
export function makePendingBonus(input: PendingBonusInput): PendingBonus {
  return {
    id: crypto.randomUUID(),
    label: input.label,
    modifier: input.modifier,
    source: input.source,
    addedAt: new Date().toISOString(),
  }
}
