import meleeModsData from '~/data/melee-mods.json'
import type { WeaponData } from '~/lib/game-logic/weapons'

export type MeleeModSlot = 'Material' | 'Body' | 'Handle' | 'Head / Blade'

export const MELEE_MOD_SLOTS: MeleeModSlot[] = [
  'Material',
  'Body',
  'Handle',
  'Head / Blade',
]

export type MeleeModCostFormula = 'weapon*2'

export interface MeleeModData {
  name: string
  slot: MeleeModSlot
  effects: string
  /** Free-text restriction shown in the picker; not enforced programmatically. */
  restrictions: string | null
  /** Flat cost in credits; null when costFormula is set. */
  cost: number | null
  costFormula: MeleeModCostFormula | null
  rarity: number
}

const ALL_MELEE_MODS = meleeModsData as MeleeModData[]
const BY_NAME = new Map(ALL_MELEE_MODS.map((m) => [m.name, m]))

export function allMeleeMods(): readonly MeleeModData[] {
  return ALL_MELEE_MODS
}

export function lookupMeleeMod(name: string): MeleeModData | undefined {
  return BY_NAME.get(name)
}

/** Resolve a mod's effective cost given the base weapon it's installed on. */
export function resolveMeleeModCost(
  mod: MeleeModData,
  weapon: WeaponData,
): number | null {
  if (mod.costFormula == null) return mod.cost
  if (weapon.cost == null) return null
  switch (mod.costFormula) {
    case 'weapon*2':
      return weapon.cost * 2
  }
}

/** Validate that a name set respects single-mod-per-slot rules. */
export function validateMeleeModSelection(
  installedNames: string[],
): { ok: true } | { ok: false; reason: string } {
  if (new Set(installedNames).size !== installedNames.length) {
    return { ok: false, reason: 'Mod list contains duplicates' }
  }
  const occupancy = new Map<MeleeModSlot, number>()
  for (const name of installedNames) {
    const m = BY_NAME.get(name)
    if (!m) return { ok: false, reason: `Unknown melee mod: ${name}` }
    const used = (occupancy.get(m.slot) ?? 0) + 1
    if (used > 1) {
      return { ok: false, reason: `Slot "${m.slot}" can only hold one mod` }
    }
    occupancy.set(m.slot, used)
  }
  return { ok: true }
}
