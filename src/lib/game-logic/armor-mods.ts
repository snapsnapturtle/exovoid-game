import armorModsData from '~/data/armor-mods.json'
import type { ArmorData } from '~/lib/game-logic/armors'

export type ArmorModCostFormula = 'armor/2' | 'armor*2'

export interface ArmorModData {
  name: string
  effects: string
  /** Flat cost in credits; null when costFormula is set. */
  cost: number | null
  costFormula: ArmorModCostFormula | null
  rarity: number
}

const ALL_ARMOR_MODS = armorModsData as ArmorModData[]
const BY_NAME = new Map(ALL_ARMOR_MODS.map((m) => [m.name, m]))

export function allArmorMods(): readonly ArmorModData[] {
  return ALL_ARMOR_MODS
}

export function lookupArmorMod(name: string): ArmorModData | undefined {
  return BY_NAME.get(name)
}

/** The mods compatible with a specific armor — filtered by its moddingOptions. */
export function armorModsFor(armor: ArmorData): ArmorModData[] {
  const allowed = new Set(armor.moddingOptions)
  return ALL_ARMOR_MODS.filter((m) => allowed.has(m.name))
}

/**
 * Resolve a mod's effective cost given the base armor it's installed on.
 * Returns null when the armor itself has no cost (un-priced armors can't
 * resolve formulaic mod costs). Result rounded down.
 */
export function resolveArmorModCost(
  mod: ArmorModData,
  armor: ArmorData,
): number | null {
  if (mod.costFormula == null) return mod.cost
  if (armor.cost == null) return null
  switch (mod.costFormula) {
    case 'armor/2':
      return Math.floor(armor.cost / 2)
    case 'armor*2':
      return armor.cost * 2
  }
}
