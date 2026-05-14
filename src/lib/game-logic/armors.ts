import armorsData from '~/data/armors.json'
import type { InventoryItem } from '~/lib/types/database'

export interface ArmorData {
  type: string
  /** Rulebook illustrative name — default display when added to inventory. */
  illustrativeName: string
  /** Max armor durability; null means this armor doesn't track durability. */
  durability: number | null
  primarySoak: number
  secondarySoak: number
  qualities: string[]
  modLimit: number
  moddingOptions: string[]
  specialRules: string
  cost: number | null
  rarity: number | null
}

const ALL_ARMORS = armorsData as ArmorData[]
const BY_TYPE = new Map(ALL_ARMORS.map((a) => [a.type, a]))

export function allArmors(): readonly ArmorData[] {
  return ALL_ARMORS
}

export function lookupArmor(armorRef: string): ArmorData | undefined {
  return BY_TYPE.get(armorRef)
}

/**
 * The active soak contribution of an inventory entry's equipped armor.
 * Returns `primarySoak` while durability > 0, `secondarySoak` once it hits 0.
 * Armor without tracked durability (cloth coats) always uses primarySoak.
 */
export function effectiveArmorSoak(
  entry: InventoryItem,
  armor: ArmorData,
): number {
  if (armor.durability == null) return armor.primarySoak
  const current = entry.currentDurability ?? armor.durability
  return current > 0 ? armor.primarySoak : armor.secondarySoak
}

export function equippedArmor(
  inventory: InventoryItem[],
): { entry: InventoryItem; data: ArmorData } | null {
  for (const entry of inventory) {
    if (entry.source !== 'armor' || !entry.equipped || !entry.armorRef) continue
    const data = lookupArmor(entry.armorRef)
    if (data) return { entry, data }
  }
  return null
}
