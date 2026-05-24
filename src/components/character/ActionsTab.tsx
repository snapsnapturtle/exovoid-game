import { Link } from '@tanstack/react-router'
import type { InventoryItem } from '~/lib/types/database'
import { lookupWeapon } from '~/lib/game-logic/weapons'
import { equippedArmor } from '~/lib/game-logic/armors'
import { EquippedWeaponCard } from './EquippedWeaponCard'
import { EquippedArmorCard } from './EquippedArmorCard'

interface ActionsTabProps {
  inventory: InventoryItem[]
  gameId: string
  characterId: string
  canEdit: boolean
  /** NPC mode hides the "go to inventory" hint when nothing is equipped —
   * NPCs use the inline Inventory tab on the same sheet. */
  isNpc?: boolean
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
  isNpc = false,
}: ActionsTabProps) {
  const weapons = inventory.filter(
    (i) => i.source === 'weapon' && i.equipped && i.weaponRef,
  )
  const worn = equippedArmor(inventory)

  if (weapons.length === 0 && !worn) {
    return (
      <div className="space-y-3">
        <p className="py-6 text-center text-sm text-gray-700">
          Nothing equipped.
        </p>
        {canEdit && !isNpc && (
          <p className="text-center text-xs text-gray-700">
            Pick up gear in your{' '}
            <Link
              to="/games/$gameId/characters/$characterId/inventory"
              params={{ gameId, characterId }}
              className="text-accent-900 transition hover:text-accent-900"
            >
              inventory
            </Link>
            , then toggle Equip on a weapon or armor.
          </p>
        )}
      </div>
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
