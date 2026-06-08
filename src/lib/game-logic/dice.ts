import type { CharacterAttributes } from '~/lib/types/database'
import type { AttributeId } from './attributes'

export interface DicePool {
  standard: number
  aptitude: number
  expertise: number
  total: number
}

// ============================================================
// Dice tables — symbol distributions per die type.
// Each die is a d20. The symbols array contains entries for each
// non-blank face; remaining faces (sides - symbols.length) are blank.
// An entry can be a single symbol or an array of symbols on one face.
// `explosive` is a marker that triggers a re-roll of the same die type;
// it is filtered out of the final result count.
// ============================================================

export type DieType = 'standard' | 'aptitude' | 'expertise' | 'injury'

export type DieSymbol =
  | 'success'
  | 'trigger'
  | 'complication'
  | 'botch'
  | 'xp'
  | 'wound'
  | 'minion'
  | 'cyberware'
  | 'adrenaline'
  | 'explosive'

interface DieTable {
  sides: number
  symbols: (DieSymbol | DieSymbol[])[]
}

export const DICE_TABLES: Record<DieType, DieTable> = {
  standard: {
    sides: 20,
    symbols: [
      ['success', 'explosive'],
      ['success', 'explosive'],
      'success',
      'success',
      'success',
      'success',
      'success',
      'success',
      'trigger',
      'trigger',
      'xp',
      'botch',
    ],
  },
  aptitude: {
    sides: 20,
    symbols: [
      'success',
      'success',
      'success',
      'success',
      'trigger',
      'trigger',
      'complication',
    ],
  },
  expertise: {
    sides: 20,
    symbols: [
      ['success', 'trigger'],
      ['success', 'trigger'],
      'success',
      'success',
      'success',
      'success',
      'trigger',
      'trigger',
      'trigger',
      'trigger',
      'complication',
    ],
  },
  injury: {
    sides: 20,
    symbols: [
      'wound',
      'wound',
      'wound',
      'wound',
      'wound',
      'minion',
      'minion',
      'minion',
      'minion',
      'minion',
      'cyberware',
      'adrenaline',
    ],
  },
}

export interface RolledDie {
  type: DieType
  symbols: DieSymbol[]
  exploded?: boolean
}

export type RollPool = Partial<Record<DieType, number>>

export type RollResult = RolledDie[]

function rollOne(type: DieType, exploded: boolean): RolledDie {
  const table = DICE_TABLES[type]
  const idx = Math.floor(Math.random() * table.sides)
  const face = idx < table.symbols.length ? table.symbols[idx] : []
  const symbols = Array.isArray(face) ? face : [face]
  return { type, symbols, exploded: exploded || undefined }
}

/**
 * Roll a dice pool. For each die type, rolls the requested count and
 * recursively re-rolls on `explosive` (each subsequent re-roll is marked
 * `exploded: true`). Returns one entry per physical die rolled.
 */
export function rollPool(pool: RollPool): RollResult {
  const result: RollResult = []
  ;(Object.keys(DICE_TABLES) as DieType[]).forEach((type) => {
    const count = pool[type] ?? 0
    for (let i = 0; i < count; i++) {
      let exploded = false
      let die: RolledDie
      do {
        die = rollOne(type, exploded)
        result.push(die)
        exploded = true
      } while (die.symbols.includes('explosive'))
    }
  })
  return result
}

/**
 * Apply a flat modifier to a dice pool.
 *
 * - Positive modifiers add to `aptitude` dice.
 * - Negative modifiers drain `aptitude` first, then `expertise`.
 * - The standard die is never modified (per the rules).
 *
 * Returns a new pool — does not mutate the input.
 */
export function applyModifier(pool: DicePool, modifier: number): DicePool {
  if (modifier === 0) return pool
  let { aptitude, expertise } = pool
  if (modifier > 0) {
    aptitude += modifier
  } else {
    let take = -modifier
    const fromAptitude = Math.min(take, aptitude)
    aptitude -= fromAptitude
    take -= fromAptitude
    if (take > 0) {
      const fromExpertise = Math.min(take, expertise)
      expertise -= fromExpertise
    }
  }
  return {
    standard: pool.standard,
    aptitude,
    expertise,
    total: pool.standard + aptitude + expertise,
  }
}

/**
 * Aggregate symbol counts from a roll result.
 *
 * - Filters out the `explosive` marker (it only triggers re-rolls).
 * - Discards exploded dice that landed on `botch` (per the rule that the
 *   player may discard the additional die from an explosive re-roll, and a
 *   botch on an exploded die is always discarded).
 *
 * Does NOT auto-apply optional conversions (2 triggers → 1 success, or
 * adopting complications for +2 successes) — those are GM/player decisions.
 */
export function summarizeRoll(result: RollResult): Record<string, number> {
  const summary: Record<string, number> = {}
  result
    .filter((d) => !(d.exploded && d.symbols.includes('botch')))
    .flatMap((d) => d.symbols)
    .filter((s) => s !== 'explosive')
    .forEach((s) => {
      summary[s] = (summary[s] ?? 0) + 1
    })
  return summary
}

// ============================================================
// Standard polyhedral dice (d4–d100) — a numeric path that sits
// alongside the symbol-based Exovoid dice above. Used by the custom
// roller for random tables, conversions, and ad-hoc GM calls. These
// roll a number rather than symbols, so they never touch DICE_TABLES,
// rollPool, or summarizeRoll.
// ============================================================

export type PolyDieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'

export const POLY_SIDES: Record<PolyDieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
}

/** Stable display order for UI rows and result grouping. */
export const POLY_DIE_ORDER: PolyDieType[] = [
  'd4',
  'd6',
  'd8',
  'd10',
  'd12',
  'd20',
  'd100',
]

export interface RolledPolyDie {
  type: PolyDieType
  value: number
}

export type PolyPool = Partial<Record<PolyDieType, number>>

/**
 * Roll a polyhedral pool. For each die type, rolls the requested count,
 * producing one numeric value (1..sides) per physical die. Returns one
 * entry per die rolled, in POLY_DIE_ORDER.
 *
 * Counts are normalized to non-negative integers — fractional, negative,
 * NaN, and Infinity values are coerced/skipped rather than trusted, since
 * the pool can arrive from an unvalidated client request.
 */
export function rollPolyPool(pool: PolyPool): RolledPolyDie[] {
  const result: RolledPolyDie[] = []
  for (const type of POLY_DIE_ORDER) {
    const raw = pool[type] ?? 0
    const count = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0
    for (let i = 0; i < count; i++) {
      result.push({
        type,
        value: Math.floor(Math.random() * POLY_SIDES[type]) + 1,
      })
    }
  }
  return result
}

/**
 * Compute the attribute average for a skill check.
 * Per rules: average of linked attributes, rounded up (ceil).
 */
export function computeAttributeAverage(
  attrs: CharacterAttributes,
  linkedAttributes: AttributeId[],
): number {
  const sum = linkedAttributes.reduce((s, attrId) => s + attrs[attrId], 0)
  return Math.ceil(sum / linkedAttributes.length)
}

/**
 * Compute the dice pool for a support contribution. Per rulebook §"Support
 * Checks": ceil(skill/2) aptitude dice — no standard, no expertise. Untrained
 * supporter (skill 0) still rolls a single aptitude die when their aid makes
 * narrative sense.
 */
export function computeSupportPool(skillLevel: number): DicePool {
  const aptitude = skillLevel <= 0 ? 1 : Math.ceil(skillLevel / 2)
  return { standard: 0, aptitude, expertise: 0, total: aptitude }
}

/**
 * Compute the dice pool for a skill check.
 *
 * Rules:
 * - Always 1 standard die
 * - The higher of (attribute average, skill level) determines total pool dice
 * - The lower determines how many become expertise dice (if skill > 0)
 * - The remainder are aptitude dice
 */
export function computeDicePool(attrAvg: number, skillLevel: number): DicePool {
  if (skillLevel === 0) {
    return {
      standard: 1,
      aptitude: attrAvg,
      expertise: 0,
      total: 1 + attrAvg,
    }
  }

  const higher = Math.max(attrAvg, skillLevel)
  const lower = Math.min(attrAvg, skillLevel)

  return {
    standard: 1,
    aptitude: higher - lower,
    expertise: lower,
    total: 1 + higher,
  }
}
