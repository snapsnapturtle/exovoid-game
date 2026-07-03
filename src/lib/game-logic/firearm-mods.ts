import firearmModsData from '~/data/firearm-mods.json'
import { lookupWeapon, type WeaponData } from '~/lib/game-logic/weapons'

export type FirearmModSlot =
  | 'Muzzle / Barrel'
  | 'Scopes'
  | 'Mechanism'
  | 'Stock'
  | 'Grip'
  | 'Magazine / Battery'
  | 'Rail Attachments'

export const FIREARM_MOD_SLOTS: FirearmModSlot[] = [
  'Muzzle / Barrel',
  'Scopes',
  'Mechanism',
  'Stock',
  'Grip',
  'Magazine / Battery',
  'Rail Attachments',
]

export type FirearmCategory =
  'Projectile Firearms' | 'Laser Firearms' | 'Plasma Firearms'

export type FirearmCompatibility = 'Any' | FirearmCategory

export interface FirearmModData {
  name: string
  slot: FirearmModSlot
  compatibleWith: FirearmCompatibility
  effects: string
  /** Free-text restriction shown in the picker; not enforced programmatically. */
  restrictions: string | null
  cost: number
  rarity: number
  /** Extended Frame: doesn't count against the weapon's mod limit. */
  freeFromModLimit: boolean
  /** Extended Frame: bumps the weapon's effective mod limit by N. */
  extraModSlotsGranted: number
  /** Dual Scope Mount: allows a second mod in this slot (free against the limit). */
  allowsExtraInSlot: FirearmModSlot | null
}

const ALL_FIREARM_MODS = firearmModsData as FirearmModData[]
const BY_NAME = new Map(ALL_FIREARM_MODS.map((m) => [m.name, m]))

export function allFirearmMods(): readonly FirearmModData[] {
  return ALL_FIREARM_MODS
}

export function lookupFirearmMod(name: string): FirearmModData | undefined {
  return BY_NAME.get(name)
}

/**
 * Classify a weapon's damageType into one of the three firearm-mod
 * compatibility buckets. Physical / Electrical / Explosive collapse to
 * "Projectile" (kinetic launch mechanism); Fire maps to "Plasma" since
 * the rulebook treats plasma weapons as fire-damage carriers.
 */
export function classifyFirearm(weapon: WeaponData): FirearmCategory {
  switch (weapon.damageType) {
    case 'Laser':
      return 'Laser Firearms'
    case 'Fire':
      return 'Plasma Firearms'
    default:
      return 'Projectile Firearms'
  }
}

/**
 * Heavy Weapons count as Firearms for mod purposes; everything else is
 * either melee or un-moddable (Throwing).
 */
export function isFirearmLike(weapon: WeaponData): boolean {
  return weapon.type === 'Firearms' || weapon.type === 'Heavy Weapons'
}

/** The mods catalog-compatible with a specific firearm. */
export function firearmModsForWeapon(weapon: WeaponData): FirearmModData[] {
  const category = classifyFirearm(weapon)
  return ALL_FIREARM_MODS.filter(
    (m) => m.compatibleWith === 'Any' || m.compatibleWith === category,
  )
}

/**
 * Count how many of the installed mods consume a mod-limit slot, accounting
 * for the two meta-mods:
 *   - Extended Frame is free (freeFromModLimit on the mod itself).
 *   - When Dual Scope Mount is installed, the second Scope mod is free.
 */
export function firearmModsConsumed(installedNames: string[]): number {
  const installed = installedNames
    .map((n) => BY_NAME.get(n))
    .filter((m): m is FirearmModData => !!m)
  let count = 0
  // Find any mod that grants "free second in slot X" and the corresponding
  // overflow allowance per slot.
  const freeSlotAllowance = new Map<FirearmModSlot, number>()
  for (const m of installed) {
    if (m.allowsExtraInSlot) {
      freeSlotAllowance.set(
        m.allowsExtraInSlot,
        (freeSlotAllowance.get(m.allowsExtraInSlot) ?? 0) + 1,
      )
    }
  }
  // Count items in each slot; the first N items in that slot up to the
  // allowance go free (above the first one, which is the "normal" slot use).
  const slotOccupancy = new Map<FirearmModSlot, number>()
  for (const m of installed) {
    if (m.freeFromModLimit) continue
    const used = slotOccupancy.get(m.slot) ?? 0
    const allowance = freeSlotAllowance.get(m.slot) ?? 0
    // Slot count in the order we encounter mods. The "first" mod in a slot
    // is always normal-cost. The 2nd through (1 + allowance)th are free.
    const isExtraFree = used >= 1 && used <= allowance
    if (!isExtraFree) count++
    slotOccupancy.set(m.slot, used + 1)
  }
  return count
}

/**
 * The bonus to the weapon's mod-limit cap from meta-mods (e.g. Extended
 * Frame). Manufacturer adjustments are handled separately in weapons.ts.
 */
export function firearmModSlotBonus(installedNames: string[]): number {
  let bonus = 0
  for (const name of installedNames) {
    const m = BY_NAME.get(name)
    if (m) bonus += m.extraModSlotsGranted
  }
  return bonus
}

/**
 * Effective slot capacity — how many mods may live in a given slot, given
 * the currently installed mods. Default is 1 per slot; Dual Scope Mount
 * bumps Scopes to 2.
 */
export function firearmSlotCapacity(
  slot: FirearmModSlot,
  installedNames: string[],
): number {
  let cap = 1
  for (const name of installedNames) {
    const m = BY_NAME.get(name)
    if (m?.allowsExtraInSlot === slot) cap += 1
  }
  return cap
}

/** Sanity: a name set is legal under the firearm slot rules. */
export function validateFirearmModSelection(
  installedNames: string[],
): { ok: true } | { ok: false; reason: string } {
  if (new Set(installedNames).size !== installedNames.length) {
    return { ok: false, reason: 'Mod list contains duplicates' }
  }
  const occupancy = new Map<FirearmModSlot, number>()
  for (const name of installedNames) {
    const m = BY_NAME.get(name)
    if (!m) return { ok: false, reason: `Unknown firearm mod: ${name}` }
    occupancy.set(m.slot, (occupancy.get(m.slot) ?? 0) + 1)
  }
  for (const [slot, used] of occupancy) {
    const cap = firearmSlotCapacity(slot, installedNames)
    if (used > cap) {
      return {
        ok: false,
        reason: `Too many mods in slot "${slot}" (${used}/${cap})`,
      }
    }
  }
  return { ok: true }
}

/** Convenience: re-lookup a weapon by ref then classify. */
export function classifyFirearmByRef(
  weaponRef: string,
): FirearmCategory | null {
  const w = lookupWeapon(weaponRef)
  return w ? classifyFirearm(w) : null
}
