import { describe, expect, it } from 'vitest'
import {
  computeShipStats,
  computeShipWarnings,
  defaultShipConfig,
  formatShipNumber,
  getShipClass,
  getShipModule,
  getShipWeapon,
  moduleAssetCost,
  moduleCapacityCost,
  modulePowerDelta,
  SHIP_CLASSES,
  SHIP_MODULES,
  SHIP_WEAPONS,
} from './ships'
import type { ShipConfig } from '~/lib/types/database'

let nextId = 0
function withModules(config: ShipConfig, ...moduleRefs: string[]): ShipConfig {
  return {
    ...config,
    modules: [
      ...config.modules,
      ...moduleRefs.map((moduleRef) => ({ id: `m${nextId++}`, moduleRef })),
    ],
  }
}

function withWeapons(config: ShipConfig, ...weaponRefs: string[]): ShipConfig {
  return {
    ...config,
    weapons: [
      ...config.weapons,
      ...weaponRefs.map((weaponRef) => ({ id: `w${nextId++}`, weaponRef })),
    ],
  }
}

describe('catalog data', () => {
  it('loads all three tables', () => {
    expect(SHIP_CLASSES).toHaveLength(8)
    expect(SHIP_MODULES).toHaveLength(73) // 75 rows minus the 2 variants
    expect(SHIP_WEAPONS).toHaveLength(22)
  })

  it('excludes the ship-wide variants from the module catalog', () => {
    expect(getShipModule('Used Ship')).toBeUndefined()
    expect(getShipModule('State-Of-The-Art Variant')).toBeUndefined()
  })
})

describe('per-module formulas (spreadsheet golden values)', () => {
  it('Fusion Generator on a Corvette: capacity 5, power +12, cost 4', () => {
    const mod = getShipModule('Fusion Generator')!
    const cls = getShipClass('Corvette')!
    const cap = moduleCapacityCost(mod, cls)
    expect(cap).toBe(5)
    expect(modulePowerDelta(mod, cap)).toBe(12)
    expect(moduleAssetCost(mod, cap)).toBe(4)
  })

  it('Ion Thrusters on a Frigate: capacity 6.5, power −1.625, cost 3.25', () => {
    const mod = getShipModule('Ion Thrusters')!
    const cls = getShipClass('Frigate')!
    const cap = moduleCapacityCost(mod, cls)
    expect(cap).toBe(6.5)
    expect(modulePowerDelta(mod, cap)).toBe(-1.625)
    expect(moduleAssetCost(mod, cap)).toBe(3.25)
  })

  it('Hull Extension on a Corvette grants capacity and still costs assets', () => {
    const mod = getShipModule('Hull Extension')!
    const cls = getShipClass('Corvette')!
    const cap = moduleCapacityCost(mod, cls)
    expect(cap).toBeCloseTo(-6.4)
    expect(moduleAssetCost(mod, cap)).toBeCloseTo(6.4)
  })
})

describe('computeShipStats', () => {
  it('returns null for an unknown class', () => {
    expect(computeShipStats(defaultShipConfig('Star Destroyer'))).toBeNull()
  })

  it('matches the spreadsheet example: Fighter + Vulcan Turret + Unguided Rockets', () => {
    const config = withWeapons(
      defaultShipConfig('Fighter'),
      'Vulcan Turret',
      'Unguided Rockets',
    )
    const stats = computeShipStats(config)!
    expect(stats.capacityTotal).toBe(11)
    expect(stats.capacityRemaining).toBe(9)
    expect(stats.powerBalance).toBe(-1)
    expect(stats.totalAssetCost).toBe(12)
  })

  it('applies the Used variant: cost ×0.75, +2 malfunction modifier', () => {
    const config: ShipConfig = {
      ...withWeapons(
        defaultShipConfig('Fighter'),
        'Vulcan Turret',
        'Unguided Rockets',
      ),
      variant: 'used',
    }
    const stats = computeShipStats(config)!
    expect(stats.totalAssetCost).toBe(9) // 12 × 0.75
    expect(stats.malfunctionModifier).toBe(2)
    expect(stats.capacityTotal).toBe(11)
  })

  it('applies the State-of-the-art variant: capacity ×1.25, cost ×1.25', () => {
    const config: ShipConfig = {
      ...withWeapons(
        defaultShipConfig('Fighter'),
        'Vulcan Turret',
        'Unguided Rockets',
      ),
      variant: 'state_of_the_art',
    }
    const stats = computeShipStats(config)!
    expect(stats.capacityTotal).toBe(13.75)
    expect(stats.totalAssetCost).toBe(15) // 12 × 1.25
  })

  it('applies flat and percentage stat effects against the class base', () => {
    // Corvette: speed 4, maneuverability 3, hull 18, armor 9, soak 1/0.
    const config = withModules(
      defaultShipConfig('Corvette'),
      'Antimatter Drive', // +3 speed, +1 maneuverability
      'Structural Enhancements', // +25% hull → ceil(4.5) = 5
      'Titanium Alloy', // +1/+1 soak, +25% armor → ceil(2.25) = 3
      'Docking Pylon', // hull −10
    )
    const stats = computeShipStats(config)!
    expect(stats.speed.total).toBe(7)
    expect(stats.maneuverability.total).toBe(4)
    expect(stats.hullMax.total).toBe(13) // 18 + 5 − 10
    expect(stats.armorMax.total).toBe(12)
    expect(stats.primarySoak.total).toBe(2)
    expect(stats.secondarySoak.total).toBe(1)
    expect(stats.hullMax.contributions).toHaveLength(3)
  })

  it('computes shield points from the class base hull', () => {
    // Impact Absorption Array: hull/10 + 4 → Fighter ceil(0.6) + 4 = 5.
    const fighter = computeShipStats(
      withModules(defaultShipConfig('Fighter'), 'Impact Absorption Array'),
    )!
    expect(fighter.shield).toEqual({
      points: 5,
      regenPct: 25,
      source: 'Impact Absorption Array',
    })

    // Aegies Defense Grid: hull/2 → Corvette ceil(9) = 9.
    const corvette = computeShipStats(
      withModules(defaultShipConfig('Corvette'), 'Aegies Defense Grid'),
    )!
    expect(corvette.shield).toEqual({
      points: 9,
      regenPct: 25,
      source: 'Aegies Defense Grid',
    })

    // Paladin Barrier Network: hull ×2 → Titan 600.
    const titan = computeShipStats(
      withModules(defaultShipConfig('Titan'), 'Paladin Barrier Network'),
    )!
    expect(titan.shield).toEqual({
      points: 600,
      regenPct: 10,
      source: 'Paladin Barrier Network',
    })
  })

  it('keeps the strongest shield when several are installed', () => {
    const stats = computeShipStats(
      withModules(
        defaultShipConfig('Corvette'),
        'Impact Absorption Array', // ceil(1.8) + 4 = 6
        'Vanguard Shield System', // 18
      ),
    )!
    expect(stats.shield?.source).toBe('Vanguard Shield System')
    expect(stats.shield?.points).toBe(18)
  })

  it('ignores unknown module and weapon refs', () => {
    const config = withWeapons(
      withModules(defaultShipConfig('Fighter'), 'Frob Coil'),
      'Death Ray',
    )
    const stats = computeShipStats(config)!
    expect(stats.capacityUsed).toBe(0)
    expect(stats.totalAssetCost).toBe(10)
  })
})

describe('computeShipWarnings', () => {
  function warningsFor(config: ShipConfig) {
    return computeShipWarnings(config, computeShipStats(config))
  }

  it('returns nothing for a clean build', () => {
    const config = withModules(
      withWeapons(defaultShipConfig('Corvette'), 'Vulcan Turret'),
      'Fusion Generator',
    )
    expect(warningsFor(config)).toEqual([])
  })

  it('warns on capacity overspend', () => {
    const config = withModules(
      defaultShipConfig('Fighter'), // capacity 11
      'Corvette Hangar', // capacity 30
    )
    const w = warningsFor(config)
    expect(w).toContainEqual(expect.objectContaining({ severity: 'warning' }))
    expect(w.some((x) => x.message.includes('Capacity exceeded by 19'))).toBe(
      true,
    )
  })

  it('flags a power deficit as info, not warning', () => {
    const config = withModules(
      defaultShipConfig('Fighter'), // balance +1
      'Cloaking Device', // consumes its capacity cost in power
    )
    const w = warningsFor(config)
    const power = w.find((x) => x.message.includes('Power deficit'))
    expect(power?.severity).toBe('info')
  })

  it('warns on duplicate once-only modules and duplicate unique types', () => {
    const config = withModules(
      defaultShipConfig('Cruiser'),
      'Hull Extension',
      'Hull Extension',
      'Burst Vector',
      'Traveller',
      'Basic Computer',
      'Advanced Computer',
      'Cloaking Device',
      'Cloaking Device',
    )
    const messages = warningsFor(config).map((w) => w.message)
    expect(messages).toContainEqual(
      expect.stringContaining('Hull Extension can only be installed once'),
    )
    expect(messages).toContainEqual(expect.stringContaining('2× FTL Drive'))
    expect(messages).toContainEqual(
      expect.stringContaining('2× Board Computer'),
    )
    expect(messages).toContainEqual(
      expect.stringContaining('Cloaking Device can only be installed once'),
    )
  })

  it('does not warn on legitimately repeatable modules', () => {
    const config = withModules(
      defaultShipConfig('Cruiser'),
      'Fusion Generator',
      'Fusion Generator',
      'Capsule Bed',
      'Capsule Bed',
    )
    expect(warningsFor(config)).toEqual([])
  })

  it('warns on incompatible armor platings', () => {
    const config = withModules(
      defaultShipConfig('Corvette'),
      'Steel Plates',
      'Titanium Alloy',
    )
    expect(warningsFor(config).map((w) => w.message)).toContainEqual(
      expect.stringContaining('Steel Plates cannot be combined'),
    )
  })

  it('flags arc-based weapons without an assigned arc as info', () => {
    const config = withWeapons(
      defaultShipConfig('Corvette'),
      'Vulcan Cannon', // arc based
      'Vulcan Turret', // turret — never flagged
    )
    const arcWarnings = warningsFor(config).filter((w) =>
      w.message.includes('firing arc'),
    )
    expect(arcWarnings).toHaveLength(1)
    expect(arcWarnings[0].severity).toBe('info')
    expect(arcWarnings[0].message).toContain('Vulcan Cannon')
  })

  it('warns when quadrant allocations exceed their pools', () => {
    const config: ShipConfig = {
      ...defaultShipConfig('Fighter'), // armor 3, no shields
      armorAllocation: { fore: 2, aft: 2, port: 0, starboard: 0 },
      shieldAllocation: { fore: 1, aft: 0, port: 0, starboard: 0 },
    }
    const messages = warningsFor(config).map((w) => w.message)
    expect(messages).toContainEqual(
      expect.stringContaining('Armor allocation (4) exceeds'),
    )
    expect(messages).toContainEqual(
      expect.stringContaining('no shield system is installed'),
    )
  })
})

describe('formatShipNumber', () => {
  it('shows at most one decimal', () => {
    expect(formatShipNumber(5)).toBe('5')
    expect(formatShipNumber(6.5)).toBe('6.5')
    expect(formatShipNumber(2.144)).toBe('2.1')
    expect(formatShipNumber(-1.625)).toBe('-1.6')
  })
})
