import { describe, expect, it } from 'vitest'
import type { CharacterAttributes } from '~/lib/types/domain'
import {
  assembleCreation,
  skillPointsSpent,
  validateCreation,
  validateCreationAttributes,
  validateCreationAttributesWithBonus,
  validateCreationSkills,
  validateCreationSkillsWithBonus,
} from './character-creation'
import { emptyProjection, type BonusProjection } from './background-bonuses'
import type { CareerData } from './talents'

const proj = (overrides: Partial<BonusProjection> = {}): BonusProjection => ({
  ...emptyProjection(),
  ...overrides,
})

const attrs = (
  overrides: Partial<CharacterAttributes> = {},
): CharacterAttributes => ({
  con: 4,
  str: 4,
  agi: 4,
  int: 4,
  edu: 4,
  per: 4,
  coo: 4,
  ...overrides,
})

describe('validateCreationAttributes (unchanged path)', () => {
  it('accepts a valid 28-point allocation', () => {
    expect(validateCreationAttributes(attrs()).ok).toBe(true)
  })
  it('rejects a total over 28', () => {
    const r = validateCreationAttributes(attrs({ con: 6 }))
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('Attribute total is 30'))).toBe(true)
  })
})

describe('validateCreationAttributesWithBonus', () => {
  it('accepts a bumped attribute that pushes past the creation cap of 6', () => {
    // Base allocation: con=6 (high-cap), rest=22 across other 6 slots.
    const base = attrs({
      con: 6,
      str: 5,
      agi: 5,
      int: 3,
      edu: 3,
      per: 3,
      coo: 3,
    })
    // Background bumps CON +1, total now exceeds 28 too — but that's expected.
    const final = { ...base, con: 7 }
    const r = validateCreationAttributesWithBonus(base, final)
    expect(r.ok).toBe(true)
  })
  it('rejects when the base is invalid', () => {
    const base = attrs({ con: 7 }) // exceeds creation cap and total
    const final = { ...base }
    const r = validateCreationAttributesWithBonus(base, final)
    expect(r.ok).toBe(false)
  })
  it('rejects when the final exceeds the lifetime ceiling (8)', () => {
    const base = attrs({
      con: 6,
      str: 4,
      agi: 4,
      int: 4,
      edu: 2,
      per: 2,
      coo: 2,
    })
    const final = { ...base, con: 9 } // forged
    const r = validateCreationAttributesWithBonus(base, final)
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('lifetime ceiling'))).toBe(true)
  })
})

describe('validateCreationSkillsWithBonus', () => {
  const baseline = { firearms: 2 }
  it('rejects when player spent points push the final past 6 with a bonus on top', () => {
    // baseline 2 + spent 4 = baseFinal 6; bonus +2 → final 8. Player spent
    // is what pushed it past the cap, so this must be invalid.
    const baseFinal = { firearms: 6 }
    const final = { firearms: 8 }
    const r = validateCreationSkillsWithBonus(baseFinal, baseline, final)
    expect(r.ok).toBe(false)
    expect(
      r.errors.some((e) => e.includes('on top of background bonuses')),
    ).toBe(true)
  })
  it('accepts when the over-cap final comes entirely from baseline + bonus (spent = 0)', () => {
    // Field Medic baseline 4 + background +3 → final 7. Player spent 0,
    // so this is the unavoidable forced over-cap case.
    const baseFinal = { medicine: 4 }
    const final = { medicine: 7 }
    const r = validateCreationSkillsWithBonus(baseFinal, { medicine: 4 }, final)
    expect(r.ok).toBe(true)
  })
  it('rejects when base exceeds the creation cap of 6', () => {
    const baseFinal = { firearms: 7 }
    const final = { firearms: 7 }
    const r = validateCreationSkillsWithBonus(baseFinal, baseline, final)
    expect(r.ok).toBe(false)
  })
  it('rejects when the final exceeds the lifetime ceiling (8)', () => {
    const baseFinal = { firearms: 6 }
    const final = { firearms: 9 }
    const r = validateCreationSkillsWithBonus(baseFinal, baseline, final)
    expect(r.ok).toBe(false)
  })
})

describe('validateCreationSkills (unchanged path)', () => {
  it('rejects an over-budget allocation', () => {
    const baseline = { firearms: 2 }
    // 6 in firearms = 4 + 2 = 6 → 4 base + 2 over-baseline-at-cap-pricing,
    // pricing: pointsForSkillLevel(6)=8, pointsForSkillLevel(2)=2, delta=6.
    // Then push another skill way past the budget.
    const final: Record<string, number> = { firearms: 6, melee: 6 }
    const r = validateCreationSkills(final, baseline)
    // melee 0→6 = 8 points; firearms 2→6 = 6 points; total = 14. Within budget.
    expect(r.ok).toBe(true)
    // Spend over-budget.
    const over: Record<string, number> = {
      firearms: 6,
      melee: 6,
      survival: 6,
      command: 6,
      tech: 6,
    }
    expect(validateCreationSkills(over, baseline).ok).toBe(false)
  })
})

describe('granted talents bypass talent checks', () => {
  it('does not count granted talents against the 2-talent limit', () => {
    const careers: CareerData[] = [
      {
        name: 'Space Marine',
        talents: [
          { talent: 'Impenetrable Shell', tier: 0 },
          { talent: 'Second Skin', tier: 0 },
        ],
      },
    ]
    const r = validateCreation(
      {
        careerName: 'Space Marine',
        attributes: attrs(),
        finalSkills: {},
        talents: [
          {
            name: 'Impenetrable Shell',
            career: 'Space Marine',
            tier: 0,
            acquiredAt: 0,
          },
          {
            name: 'Second Skin',
            career: 'Space Marine',
            tier: 0,
            acquiredAt: 0,
          },
          // Granted from a background bonus — must NOT count toward the limit
          // nor be checked against the Space Marine tree.
          {
            name: 'Sprinter',
            career: '',
            tier: 0,
            acquiredAt: 0,
            granted: true,
          },
          {
            name: 'Danger Sense',
            career: '',
            tier: 0,
            acquiredAt: 0,
            granted: true,
          },
        ],
      },
      careers,
    )
    expect(r.ok).toBe(true)
  })
})

describe('skill-points budget threading', () => {
  it('accepts a 33-point spend when budget is widened by background bonus', () => {
    const careers: CareerData[] = [
      { name: 'Field Medic', talents: [], startingSkills: [] },
    ]
    const finalSkills: Record<string, number> = {
      // 3 skills at 5 = 5+5+5 = 15 points each at level pricing (1+1+1+1+2)
      // 5 cost: pointsForSkillLevel(5)=6. Three skills at 5 = 18 points.
      // Three skills at 6 = 8 each = 24. Pick 4 skills at 5 + 2 at 1: 6*4 + 1+1 + 1 = 27. Hmm.
      // Simpler: 33 points distribution: 4 skills at 6 = 32, + 1 at 1 = 33.
      firearms: 6,
      melee: 6,
      defense: 6,
      survival: 6,
      command: 1,
    }
    // pointsForSkillLevel sums: 8+8+8+8+1 = 33.
    const r = validateCreation(
      {
        careerName: 'Field Medic',
        attributes: attrs(),
        finalSkills,
        talents: [],
        skillPointsBudget: 33,
      },
      careers,
    )
    expect(r.ok).toBe(true)
  })

  it('rejects the same allocation against the default 30 budget', () => {
    const careers: CareerData[] = [
      { name: 'Field Medic', talents: [], startingSkills: [] },
    ]
    const finalSkills: Record<string, number> = {
      firearms: 6,
      melee: 6,
      defense: 6,
      survival: 6,
      command: 1,
    }
    const r = validateCreation(
      {
        careerName: 'Field Medic',
        attributes: attrs(),
        finalSkills,
        talents: [],
      },
      careers,
    )
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('budget is 30'))).toBe(true)
  })
})

describe('validateCreation', () => {
  const careers: CareerData[] = [
    {
      name: 'Field Medic',
      startingSkills: [
        { name: 'Medicine', level: 4 },
        { name: 'Survival', level: 2 },
      ],
      talents: [{ talent: 'Anatomical Insight', tier: 0 }],
    },
  ]

  it('accepts a clean creation with no bonuses', () => {
    const r = validateCreation(
      {
        careerName: 'Field Medic',
        attributes: attrs(),
        finalSkills: { medicine: 4, survival: 2 },
        talents: [],
      },
      careers,
    )
    expect(r.ok).toBe(true)
  })

  it('accepts post-bonus attributes that push past the creation cap when base is valid', () => {
    const base = attrs({
      edu: 6,
      con: 5,
      str: 5,
      agi: 4,
      int: 2,
      per: 3,
      coo: 3,
    })
    const final = { ...base, edu: 7 } // background bump
    const r = validateCreation(
      {
        careerName: 'Field Medic',
        attributes: final,
        baseAttributes: base,
        finalSkills: { medicine: 4, survival: 2 },
        talents: [],
      },
      careers,
    )
    expect(r.ok).toBe(true)
  })

  it('rejects forged attributes that exceed the lifetime ceiling', () => {
    const base = attrs({
      edu: 6,
      con: 5,
      str: 5,
      agi: 4,
      int: 2,
      per: 3,
      coo: 3,
    })
    const final = { ...base, edu: 99 }
    const r = validateCreation(
      {
        careerName: 'Field Medic',
        attributes: final,
        baseAttributes: base,
        finalSkills: { medicine: 4, survival: 2 },
        talents: [],
      },
      careers,
    )
    expect(r.ok).toBe(false)
  })
})

describe('skillPointsSpent', () => {
  it('charges 1 point per level for 1–4', () => {
    expect(skillPointsSpent({ firearms: 4 }, {})).toBe(4)
  })
  it('charges 2 points per level for 5 and 6', () => {
    // 1+1+1+1+2+2 = 8
    expect(skillPointsSpent({ firearms: 6 }, {})).toBe(8)
  })
  it('treats the career baseline as free', () => {
    expect(skillPointsSpent({ firearms: 3 }, { firearms: 3 })).toBe(0)
  })
  it('only charges the delta above the baseline', () => {
    // pointsForSkillLevel(4) - pointsForSkillLevel(2) = 4 - 2 = 2
    expect(skillPointsSpent({ firearms: 4 }, { firearms: 2 })).toBe(2)
  })
  it('sums across every skill', () => {
    expect(skillPointsSpent({ firearms: 4, melee: 2 }, {})).toBe(6)
  })

  it('never returns NaN for non-finite inputs (those skills contribute 0)', () => {
    expect(skillPointsSpent({ firearms: NaN, melee: 3 }, {})).toBe(3)
    expect(skillPointsSpent({ firearms: Infinity }, {})).toBe(0)
  })
})

describe('assembleCreation', () => {
  const career: CareerData = {
    name: 'Field Medic',
    startingSkills: [{ name: 'Medicine', level: 2 }],
    talents: [
      { talent: 'Triage', tier: 0 },
      { talent: 'Field Surgery', tier: 1 },
    ],
  }

  it('stacks career baseline + spent points + background skill bumps', () => {
    const result = assembleCreation({
      career,
      baseAttributes: attrs(),
      skillsSpent: { medicine: 2, firearms: 1 },
      startingTalents: [],
      projection: proj({ skillDeltas: { medicine: 1 } }),
    })
    // baseline 2 + spent 2 = 4 (pre-bonus); + bonus 1 = 5 (final)
    expect(result.baseFinalSkills.medicine).toBe(4)
    expect(result.finalSkills.medicine).toBe(5)
    expect(result.baseFinalSkills.firearms).toBe(1)
    expect(result.finalSkills.firearms).toBe(1)
  })

  it('applies background attribute deltas onto the base attributes', () => {
    const result = assembleCreation({
      career,
      baseAttributes: attrs({ con: 4 }),
      skillsSpent: {},
      startingTalents: [],
      projection: proj({ attributeDeltas: { con: 2 } }),
    })
    expect(result.finalAttrs.con).toBe(6)
    expect(result.finalAttrs.str).toBe(4)
  })

  it('maps career-tree talents with their tier and appends granted ones', () => {
    const result = assembleCreation({
      career,
      baseAttributes: attrs(),
      skillsSpent: {},
      startingTalents: ['Field Surgery'],
      projection: proj({ grantedTalentNames: ['Sprinter'] }),
    })
    const picked = result.talentEntries.find((t) => t.name === 'Field Surgery')
    expect(picked).toMatchObject({ career: 'Field Medic', tier: 1 })
    expect(picked?.granted).toBeUndefined()
    const granted = result.talentEntries.find((t) => t.name === 'Sprinter')
    expect(granted).toMatchObject({ career: '', granted: true })
  })

  it('does not duplicate a granted talent that was already picked from the tree', () => {
    const result = assembleCreation({
      career,
      baseAttributes: attrs(),
      skillsSpent: {},
      startingTalents: ['Triage'],
      projection: proj({ grantedTalentNames: ['Triage'] }),
    })
    expect(
      result.talentEntries.filter((t) => t.name === 'Triage'),
    ).toHaveLength(1)
  })

  it('keeps only the non-zero derived-stat bonuses', () => {
    const result = assembleCreation({
      career,
      baseAttributes: attrs(),
      skillsSpent: {},
      startingTalents: [],
      projection: proj({
        derivedStatBonuses: { maxHealth: 2, maxEdge: 0, cyberImmunity: 0 },
      }),
    })
    expect(result.derivedStatBonuses).toEqual({ maxHealth: 2 })
  })

  it('derives credits, assets, and the skill-point budget from the projection', () => {
    const result = assembleCreation({
      career,
      baseAttributes: attrs(),
      skillsSpent: {},
      startingTalents: [],
      projection: proj({
        creditDelta: 500,
        assetDelta: 3,
        skillPointsBonus: 3,
      }),
    })
    expect(result.credits).toBe(1500)
    expect(result.assets).toBe(3)
    expect(result.skillPointsBudget).toBe(33)
  })
})
