import { createContext, useContext, type ReactNode } from 'react'
import type { PendingBonus } from '~/lib/types/domain'
import type { PendingBonusInput } from '~/lib/game-logic/pending-bonuses'

/**
 * The roll-surface bundle that every descendant of a sheet/participant/downtime
 * owner needs to hand to `DiceRoller`: the character's pending pool bonuses plus
 * the apply/consume/remove trio, the current Edge and how to spend it, and the
 * default "Hidden roll" state. Provided once at each owner site so the
 * intermediate components (WeaponRow, ActionPanel, CombatRollModal, SkillsPanel,
 * DerivedStatsPanel) don't thread it through.
 */
export interface RollContextValue {
  pendingBonuses: PendingBonus[]
  applyBonus: (bonus: PendingBonusInput) => string
  consumeBonuses: (ids: string[]) => void
  removeBonus: (id: string) => void
  edgeAvailable: number | undefined
  onSpendEdge: () => void | Promise<void>
  defaultHidden: boolean
}

const RollContext = createContext<RollContextValue | null>(null)

export function RollContextProvider({
  value,
  children,
}: {
  value: RollContextValue
  children: ReactNode
}) {
  return <RollContext.Provider value={value}>{children}</RollContext.Provider>
}

/**
 * Read the roll bundle. Returns null outside a provider — `DiceRoller` is also
 * rendered in support mode, where edge/bonus affordances are suppressed
 * regardless, so a missing context is a valid (no-op) state, not an error.
 */
export function useRollContext(): RollContextValue | null {
  return useContext(RollContext)
}
