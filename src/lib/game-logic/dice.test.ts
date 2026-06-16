import { describe, expect, it } from 'vitest'
import {
  POLY_DIE_ORDER,
  POLY_SIDES,
  rollPolyPool,
  uniqueRolls,
  type PolyDieType,
} from './dice'

describe('rollPolyPool', () => {
  it('returns one entry per requested die, in POLY_DIE_ORDER', () => {
    const result = rollPolyPool({ d20: 2, d6: 3 })
    expect(result).toHaveLength(5)
    // d6 comes before d20 in POLY_DIE_ORDER, so entries are grouped in order.
    expect(result.map((d) => d.type)).toEqual(['d6', 'd6', 'd6', 'd20', 'd20'])
  })

  it('produces values within 1..sides for every die type', () => {
    // Roll a large pool of each die type and assert bounds hold.
    const pool = Object.fromEntries(
      POLY_DIE_ORDER.map((t) => [t, 50]),
    ) as Record<PolyDieType, number>
    const result = rollPolyPool(pool)
    for (const die of result) {
      expect(die.value).toBeGreaterThanOrEqual(1)
      expect(die.value).toBeLessThanOrEqual(POLY_SIDES[die.type])
      expect(Number.isInteger(die.value)).toBe(true)
    }
  })

  it('returns an empty result for an empty pool', () => {
    expect(rollPolyPool({})).toEqual([])
    expect(rollPolyPool({ d6: 0 })).toEqual([])
  })

  it('normalizes untrusted counts to non-negative integers', () => {
    // Fractional counts floor (2.9 → 2), never rounding up via `i < count`.
    expect(rollPolyPool({ d6: 2.9 })).toHaveLength(2)
    // Negative, NaN, and Infinity counts roll nothing rather than throwing
    // or looping forever.
    expect(rollPolyPool({ d6: -3 })).toEqual([])
    expect(rollPolyPool({ d6: NaN })).toEqual([])
    expect(rollPolyPool({ d6: Infinity })).toEqual([])
  })
})

describe('uniqueRolls', () => {
  it('returns `count` fresh rolls appended to the exclude set', () => {
    const result = uniqueRolls(2, 20, [5, 7])
    expect(result).toHaveLength(4)
    expect(result.slice(0, 2)).toEqual([5, 7])
  })

  it('produces only distinct values', () => {
    const result = uniqueRolls(10, 10)
    expect(new Set(result).size).toBe(result.length)
  })

  it('never repeats a value already in `exclude`', () => {
    // 8 of 10 faces are excluded, so the 2 fresh rolls must be the 2 unused.
    const exclude = [1, 2, 3, 4, 5, 6, 7, 8]
    const result = uniqueRolls(2, 10, exclude)
    const fresh = result.slice(exclude.length)
    expect(fresh.every((r) => !exclude.includes(r))).toBe(true)
    expect(new Set(fresh)).toEqual(new Set([9, 10]))
  })

  it('rolls within 1..max', () => {
    const result = uniqueRolls(6, 6)
    expect(new Set(result)).toEqual(new Set([1, 2, 3, 4, 5, 6]))
  })

  it('defaults to an empty exclude set', () => {
    expect(uniqueRolls(3, 20)).toHaveLength(3)
  })
})
