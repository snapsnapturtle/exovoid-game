import weaponsData from '~/data/weapons.json'
import { lookupManufacturer } from '~/lib/game-logic/manufacturers'
import { firearmModSlotBonus, isFirearmLike } from '~/lib/game-logic/firearm-mods'

export type WeaponType = 'Firearms' | 'Heavy Weapons' | 'Melee' | 'Throwing'

export interface WeaponData {
  type: WeaponType
  /** Canonical identifier (catalog key). */
  weapon: string
  /** Rulebook illustrative name — default display when added to inventory. */
  illustrativeName: string
  hands: number
  magazine: number | null
  reloadAP: number | null
  attackAP: number
  damage: number
  damageType: string
  optimalRange: string
  maxRange: number | null
  qualities: string[]
  triggerOptions: string[]
  specialRules: string
  modLimit: number
  cost: number | null
  roundCost: number | null
  rarity: number | null
}

const ALL_WEAPONS = weaponsData as WeaponData[]
const BY_WEAPON = new Map(ALL_WEAPONS.map((w) => [w.weapon, w]))

export function allWeapons(): readonly WeaponData[] {
  return ALL_WEAPONS
}

export function lookupWeapon(weaponRef: string): WeaponData | undefined {
  return BY_WEAPON.get(weaponRef)
}

/** Group catalog weapons by type in CSV order for the picker UI. */
export function weaponsByType(): { type: WeaponType; weapons: WeaponData[] }[] {
  const groups: { type: WeaponType; weapons: WeaponData[] }[] = []
  const indexByType = new Map<WeaponType, number>()
  for (const w of ALL_WEAPONS) {
    let idx = indexByType.get(w.type)
    if (idx === undefined) {
      idx = groups.length
      indexByType.set(w.type, idx)
      groups.push({ type: w.type, weapons: [] })
    }
    groups[idx].weapons.push(w)
  }
  return groups
}

/**
 * The effective mod limit for a weapon instance: base modLimit plus the
 * manufacturer's `modSlotAdjust` plus any bonus from installed meta-mods
 * (Extended Frame). Floored at 0. The relevant manufacturer entry depends
 * on the weapon's class (firearm-like weapons read the `firearms` bucket,
 * melee weapons read `melee`).
 */
export function effectiveWeaponModLimit(
  weapon: WeaponData,
  manufacturerRef: string | undefined,
  installedMods: string[] = [],
): number {
  const base = weapon.modLimit
  let adjust = 0
  if (manufacturerRef) {
    const m = lookupManufacturer(manufacturerRef)
    const key = isFirearmLike(weapon) ? 'firearms' : 'melee'
    adjust = m?.effectsByType[key]?.modSlotAdjust ?? 0
  }
  const metaBonus = isFirearmLike(weapon)
    ? firearmModSlotBonus(installedMods)
    : 0
  return Math.max(0, base + adjust + metaBonus)
}

/**
 * Parse a quality string like "Concealed (1)" or "Silenced" into its
 * base name and numeric level. The base name is the lookup key into
 * item-qualities.json; level (if any) is the magnitude annotation.
 */
export function parseQuality(raw: string): { name: string; level: number | null } {
  const m = raw.match(/^(.+?)\s*\((\d+)\)\s*$/)
  if (!m) return { name: raw.trim(), level: null }
  return { name: m[1].trim(), level: parseInt(m[2], 10) }
}
