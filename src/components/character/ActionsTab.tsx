import type { InventoryItem } from '~/lib/types/domain'
import { lookupWeapon } from '~/lib/game-logic/weapons'
import { equippedArmor } from '~/lib/game-logic/armors'
import { EquippedWeaponCard } from './EquippedWeaponCard'
import { EquippedArmorCard } from './EquippedArmorCard'

interface ActionsTabProps {
  inventory: InventoryItem[]
  gameId: string
  characterId: string
  canEdit: boolean
}

/**
 * The "Actions" tab on the character sheet. Surfaces the character's
 * currently equipped weapons and armor as compact cards — talents and
 * activated cyberware will join here later as the action-card pattern
 * crystallises.
 */
export function ActionsTab({
  inventory,
  gameId,
  characterId,
  canEdit,
}: ActionsTabProps) {
  const weapons = inventory.filter(
    (i) => i.source === 'weapon' && i.equipped && i.weaponRef,
  )
  const worn = equippedArmor(inventory)

  if (weapons.length === 0 && !worn) {
    return (
      <p className="py-6 text-center text-sm text-gray-700">
        Nothing equipped.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {worn && <EquippedArmorCard entry={worn.entry} armor={worn.data} />}
      {weapons.length > 0 && (
        <ul className="space-y-2">
          {weapons.map((entry) => {
            const w = lookupWeapon(entry.weaponRef!)
            if (!w) return null
            return (
              <li key={entry.id}>
                <EquippedWeaponCard entry={entry} weapon={w} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
