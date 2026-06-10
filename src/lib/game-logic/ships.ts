// Ship builder math. All formulas verified against the Ship Builder sheet in
// rules/Exovoid Ship Builder.xlsx — sums use exact fractions (the sheet never
// rounds); Math.ceil only where the rules say "round up" (percentage effects,
// shield points). Derived stats are computed, never stored.

import type {
  FiringArc,
  ShipConfig,
  ShipModuleEntry,
  ShipQuadrants,
  ShipVariant,
  ShipWeaponEntry,
} from '~/lib/types/database'
import shipClassesData from '~/data/ship-classes.json'
import shipSystemsData from '~/data/ship-systems.json'
import shipWeaponsData from '~/data/ship-weapons.json'

export interface ShipClass {
  shipClass: string
  sizeClass: number
  bridgeSize: number
  maneuverability: number
  speed: number
  basePowerNeeded: number
  powerGenerated: number
  hull: number
  armorDurability: number
  primarySoak: number
  secondarySoak: number
  systemsCapacity: number
  assetCost: number
  rarity: number
}

export type ShipModuleEffect =
  | {
      kind: 'stat'
      stat:
        | 'speed'
        | 'maneuverability'
        | 'hull'
        | 'armorDurability'
        | 'primarySoak'
        | 'secondarySoak'
      value: number
    }
  /** ceil(class base × pct/100), additive between sources ("+25% Hull (round up)"). */
  | { kind: 'statPct'; stat: 'hull' | 'armorDurability'; pct: number }
  /** points = ceil(class base hull × hullFactor) + flat. */
  | { kind: 'shield'; hullFactor: number; flat: number; regenPct: number }

export interface ShipSystem {
  systemType: string
  name: string
  kind: 'module' | 'variant'
  capacityMultiplier: number
  capacityModifier: number
  powerRequirementMultiplier: number
  powerRequirementModifier: number
  description: string
  assetCostMultiplier: number
  assetCostModifier: number
  rarity: number
  effects?: ShipModuleEffect[]
}

export interface ShipWeapon {
  type: 'Arc Based' | 'Turret'
  weapon: string
  illustrativeName: string
  capacityCost: number
  powerRequirement: number
  magazine: number | null
  reloadAP: string | null
  attackAP: number
  damage: number
  damageType: string
  optimalRange: string | null
  /** null = unlimited (railguns). */
  maxRange: number | null
  qualities: string[]
  triggerOptions: string[]
  assetCost: number
  magCost: number | null
  rarity: number
}

export const SHIP_CLASSES = shipClassesData as ShipClass[]
const ALL_SHIP_SYSTEMS = shipSystemsData as ShipSystem[]
/** Installable modules — the two ship-wide variant rows are excluded. */
export const SHIP_MODULES = ALL_SHIP_SYSTEMS.filter((s) => s.kind === 'module')
export const SHIP_WEAPONS = shipWeaponsData as ShipWeapon[]

const CLASS_BY_NAME = new Map(SHIP_CLASSES.map((c) => [c.shipClass, c]))
const MODULE_BY_NAME = new Map(SHIP_MODULES.map((m) => [m.name, m]))
const WEAPON_BY_NAME = new Map(SHIP_WEAPONS.map((w) => [w.weapon, w]))

export function getShipClass(classRef: string): ShipClass | undefined {
  return CLASS_BY_NAME.get(classRef)
}

export function getShipModule(moduleRef: string): ShipSystem | undefined {
  return MODULE_BY_NAME.get(moduleRef)
}

export function getShipWeapon(weaponRef: string): ShipWeapon | undefined {
  return WEAPON_BY_NAME.get(weaponRef)
}

export const FIRING_ARCS: FiringArc[] = ['fore', 'aft', 'port', 'starboard']

export const FIRING_ARC_LABELS: Record<FiringArc, string> = {
  fore: 'Fore',
  aft: 'Aft',
  port: 'Port',
  starboard: 'Starboard',
}

export const SHIP_VARIANT_LABELS: Record<ShipVariant, string> = {
  standard: 'Standard',
  used: 'Used',
  state_of_the_art: 'State-of-the-art',
}

export const EMPTY_QUADRANTS: ShipQuadrants = {
  fore: 0,
  aft: 0,
  port: 0,
  starboard: 0,
}

export function quadrantTotal(q: ShipQuadrants): number {
  return q.fore + q.aft + q.port + q.starboard
}

export function defaultShipConfig(classRef: string): ShipConfig {
  return {
    classRef,
    variant: 'standard',
    modules: [],
    weapons: [],
    armorAllocation: { ...EMPTY_QUADRANTS },
    shieldAllocation: { ...EMPTY_QUADRANTS },
  }
}

// --- Per-module formulas (Ship Builder sheet, columns E/F/G) -----------------

/** Capacity a module occupies on a given class. Can be negative — Hull
 * Extension (multiplier −0.2) *grants* capacity. */
export function moduleCapacityCost(mod: ShipSystem, cls: ShipClass): number {
  return mod.capacityMultiplier * cls.systemsCapacity + mod.capacityModifier
}

/** Power contribution of a module (negative = consumes, positive = generates;
 * generators carry negative powerRequirementModifier in the catalog). */
export function modulePowerDelta(
  mod: ShipSystem,
  capacityCost: number,
): number {
  return -(
    mod.powerRequirementMultiplier * capacityCost +
    mod.powerRequirementModifier
  )
}

export function moduleAssetCost(mod: ShipSystem, capacityCost: number): number {
  return mod.assetCostMultiplier * capacityCost + mod.assetCostModifier
}

// --- Derived stats ------------------------------------------------------------

export interface Contribution {
  source: string
  value: number
}

export interface ShipStatBlock {
  base: number
  total: number
  contributions: Contribution[]
}

export interface ShipDerivedStats {
  shipClass: ShipClass
  capacityTotal: number
  capacityUsed: number
  capacityRemaining: number
  /** Generated − consumed across base ship, modules and weapons. Negative is
   * legal — energy gets re-distributed at the start of each combat round. */
  powerBalance: number
  totalAssetCost: number
  speed: ShipStatBlock
  maneuverability: ShipStatBlock
  hullMax: ShipStatBlock
  armorMax: ShipStatBlock
  primarySoak: ShipStatBlock
  secondarySoak: ShipStatBlock
  shield: { points: number; regenPct: number; source: string } | null
  /** +2 while the ship is a Used variant (applies to malfunction rolls). */
  malfunctionModifier: number
}

interface ResolvedModule {
  entry: ShipModuleEntry
  mod: ShipSystem
  capacityCost: number
  powerDelta: number
  assetCost: number
}

interface ResolvedWeapon {
  entry: ShipWeaponEntry
  weapon: ShipWeapon
}

function resolveModules(config: ShipConfig, cls: ShipClass): ResolvedModule[] {
  return config.modules.flatMap((entry) => {
    const mod = MODULE_BY_NAME.get(entry.moduleRef)
    if (!mod) return []
    const capacityCost = moduleCapacityCost(mod, cls)
    return [
      {
        entry,
        mod,
        capacityCost,
        powerDelta: modulePowerDelta(mod, capacityCost),
        assetCost: moduleAssetCost(mod, capacityCost),
      },
    ]
  })
}

function resolveWeapons(config: ShipConfig): ResolvedWeapon[] {
  return config.weapons.flatMap((entry) => {
    const weapon = WEAPON_BY_NAME.get(entry.weaponRef)
    return weapon ? [{ entry, weapon }] : []
  })
}

function buildStat(
  base: number,
  source: string,
  adds: Contribution[],
): ShipStatBlock {
  const contributions = [{ source, value: base }, ...adds]
  return {
    base,
    total: contributions.reduce((sum, c) => sum + c.value, 0),
    contributions,
  }
}

export function computeShipStats(config: ShipConfig): ShipDerivedStats | null {
  const cls = CLASS_BY_NAME.get(config.classRef)
  if (!cls) return null

  const modules = resolveModules(config, cls)
  const weapons = resolveWeapons(config)

  const capacityTotal =
    config.variant === 'state_of_the_art'
      ? cls.systemsCapacity * 1.25
      : cls.systemsCapacity
  const capacityUsed =
    modules.reduce((sum, m) => sum + m.capacityCost, 0) +
    weapons.reduce((sum, w) => sum + w.weapon.capacityCost, 0)

  const powerBalance =
    cls.powerGenerated -
    cls.basePowerNeeded +
    modules.reduce((sum, m) => sum + m.powerDelta, 0) -
    weapons.reduce((sum, w) => sum + w.weapon.powerRequirement, 0)

  const rawAssetCost =
    cls.assetCost +
    modules.reduce((sum, m) => sum + m.assetCost, 0) +
    weapons.reduce((sum, w) => sum + w.weapon.assetCost, 0)
  const costFactor =
    config.variant === 'used'
      ? 0.75
      : config.variant === 'state_of_the_art'
        ? 1.25
        : 1
  const totalAssetCost = rawAssetCost * costFactor

  // Stat effects: flat adds and percentage adds both reference the *class
  // base* value (additive between sources, each ceil'd per the rulebook's
  // "round up" wording).
  const statAdds: Record<string, Contribution[]> = {
    speed: [],
    maneuverability: [],
    hull: [],
    armorDurability: [],
    primarySoak: [],
    secondarySoak: [],
  }
  let shield: ShipDerivedStats['shield'] = null
  const classBase: Record<string, number> = {
    speed: cls.speed,
    maneuverability: cls.maneuverability,
    hull: cls.hull,
    armorDurability: cls.armorDurability,
    primarySoak: cls.primarySoak,
    secondarySoak: cls.secondarySoak,
  }

  for (const { mod } of modules) {
    for (const effect of mod.effects ?? []) {
      if (effect.kind === 'stat') {
        statAdds[effect.stat].push({ source: mod.name, value: effect.value })
      } else if (effect.kind === 'statPct') {
        statAdds[effect.stat].push({
          source: mod.name,
          value: Math.ceil((classBase[effect.stat] * effect.pct) / 100),
        })
      } else {
        // Shield points compute from the *class base* hull, unaffected by
        // hull-modifying modules. ⚠️ Open rules question — "Base Hull" could
        // also mean post-module hull; confirm with the game designer.
        const points = Math.ceil(cls.hull * effect.hullFactor) + effect.flat
        // Multiple shield systems don't stack — keep the strongest.
        if (!shield || points > shield.points) {
          shield = { points, regenPct: effect.regenPct, source: mod.name }
        }
      }
    }
  }

  return {
    shipClass: cls,
    capacityTotal,
    capacityUsed,
    capacityRemaining: capacityTotal - capacityUsed,
    powerBalance,
    totalAssetCost,
    speed: buildStat(cls.speed, cls.shipClass, statAdds.speed),
    maneuverability: buildStat(
      cls.maneuverability,
      cls.shipClass,
      statAdds.maneuverability,
    ),
    hullMax: buildStat(cls.hull, cls.shipClass, statAdds.hull),
    armorMax: buildStat(
      cls.armorDurability,
      cls.shipClass,
      statAdds.armorDurability,
    ),
    primarySoak: buildStat(
      cls.primarySoak,
      cls.shipClass,
      statAdds.primarySoak,
    ),
    secondarySoak: buildStat(
      cls.secondarySoak,
      cls.shipClass,
      statAdds.secondarySoak,
    ),
    shield,
    malfunctionModifier: config.variant === 'used' ? 2 : 0,
  }
}

// --- Warnings (never block saving) --------------------------------------------

export type ShipWarning = {
  /** `warning` renders amber-alert; `info` renders info-alert. */
  severity: 'warning' | 'info'
  message: string
}

/** Modules that realistically install once — duplicates warn (still legal to
 * save; the GM arbitrates). Hull Extension is explicit in the rules; the rest
 * were agreed at the table. */
const UNIQUE_MODULE_TYPES = new Set(['FTL Drive'])
const UNIQUE_MODULE_NAMES = new Set(['Hull Extension', 'Cloaking Device'])
const UNIQUE_MODULE_TYPE_PREFIXES = ['Board Computer']

/** Pairs that the catalog text declares incompatible. */
const INCOMPATIBLE_MODULES: [string, string][] = [
  ['Steel Plates', 'Titanium Alloy'],
]

export function computeShipWarnings(
  config: ShipConfig,
  stats: ShipDerivedStats | null,
): ShipWarning[] {
  if (!stats) return []
  const warnings: ShipWarning[] = []

  if (stats.capacityRemaining < 0) {
    warnings.push({
      severity: 'warning',
      message: `Capacity exceeded by ${formatShipNumber(-stats.capacityRemaining)} — the class fits ${formatShipNumber(stats.capacityTotal)}.`,
    })
  }

  if (stats.powerBalance < 0) {
    warnings.push({
      severity: 'info',
      message: `Power deficit of ${formatShipNumber(-stats.powerBalance)} — not every system can run at once; energy must be re-distributed each combat round.`,
    })
  }

  const counts = new Map<string, number>()
  for (const entry of config.modules) {
    counts.set(entry.moduleRef, (counts.get(entry.moduleRef) ?? 0) + 1)
  }
  const flaggedTypes = new Set<string>()
  for (const [name, count] of counts) {
    const mod = MODULE_BY_NAME.get(name)
    if (!mod) continue
    if (count > 1 && UNIQUE_MODULE_NAMES.has(name)) {
      warnings.push({
        severity: 'warning',
        message: `${name} can only be installed once (×${count} installed).`,
      })
    }
    const typeIsUnique =
      UNIQUE_MODULE_TYPES.has(mod.systemType) ||
      UNIQUE_MODULE_TYPE_PREFIXES.includes(mod.systemType)
    if (typeIsUnique && !flaggedTypes.has(mod.systemType)) {
      const typeTotal = config.modules.filter((e) => {
        const m = MODULE_BY_NAME.get(e.moduleRef)
        return m?.systemType === mod.systemType
      }).length
      if (typeTotal > 1) {
        flaggedTypes.add(mod.systemType)
        warnings.push({
          severity: 'warning',
          message: `${typeTotal}× ${mod.systemType} installed — ships usually carry one.`,
        })
      }
    }
  }

  for (const [a, b] of INCOMPATIBLE_MODULES) {
    if (counts.has(a) && counts.has(b)) {
      warnings.push({
        severity: 'warning',
        message: `${a} cannot be combined with ${b}.`,
      })
    }
  }

  for (const entry of config.weapons) {
    const weapon = WEAPON_BY_NAME.get(entry.weaponRef)
    if (weapon?.type === 'Arc Based' && !entry.arc) {
      warnings.push({
        severity: 'info',
        message: `${entry.name ?? weapon.weapon} has no firing arc assigned.`,
      })
    }
  }

  const armorAllocated = quadrantTotal(config.armorAllocation)
  if (armorAllocated > stats.armorMax.total) {
    warnings.push({
      severity: 'warning',
      message: `Armor allocation (${armorAllocated}) exceeds the ship's armor durability (${stats.armorMax.total}).`,
    })
  }
  const shieldAllocated = quadrantTotal(config.shieldAllocation)
  const shieldPoints = stats.shield?.points ?? 0
  if (shieldAllocated > shieldPoints) {
    warnings.push({
      severity: 'warning',
      message: stats.shield
        ? `Shield allocation (${shieldAllocated}) exceeds the shield system's points (${shieldPoints}).`
        : `Shield points allocated (${shieldAllocated}) but no shield system is installed.`,
    })
  }

  return warnings
}

/** Display helper: exact values internally, at most 1 decimal shown. */
export function formatShipNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
