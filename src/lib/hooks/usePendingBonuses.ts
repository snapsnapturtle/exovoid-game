import { useCallback } from 'react'
import type { PendingBonus } from '~/lib/types/domain'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'
import { makePendingBonus } from '~/lib/game-logic/pending-bonuses'

/**
 * The apply/consume/remove trio shared by every roll surface. The only thing
 * that varies between call sites is the persistence sink — the character sheet
 * and downtime activities route through `updateField('pending_bonuses', …)`,
 * while the combat tracker keeps a local optimistic copy and writes the row
 * directly. Pass `bonuses` (the current array) and `persist` (the sink); the
 * returned callbacks compute the next array and hand it off.
 */
export function usePendingBonuses(
  bonuses: PendingBonus[],
  persist: (next: PendingBonus[]) => void,
) {
  const apply = useCallback(
    (bonus: ApplyBonusInput): string => {
      const entry = makePendingBonus(bonus)
      persist([...bonuses, entry])
      return entry.id
    },
    [bonuses, persist],
  )

  const consume = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      const drop = new Set(ids)
      persist(bonuses.filter((b) => !drop.has(b.id)))
    },
    [bonuses, persist],
  )

  const remove = useCallback((id: string) => consume([id]), [consume])

  return { apply, consume, remove }
}
