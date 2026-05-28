import { describe, expect, it } from 'vitest'
import {
  attributeChoicesFor,
  bonusNeedsChoice,
  emptyProjection,
  projectResolvedBonuses,
  resolveFixed,
  skillChoicesFor,
  talentChoicesFor,
  type BackgroundBonus,
  type LeafBonus,
  type ResolvedBonus,
} from './background-bonuses'
import type { CareerData } from './talents'

const careers: CareerData[] = [
  {
    name: 'Field Medic',
    talents: [
      { talent: 'Anatomical Insight', tier: 0 },
      { talent: 'First Aid Pro', tier: 0 },
      { talent: 'Combat Medic', tier: 1 },
      { talent: 'Surgeon', tier: 2 },
    ],
  },
  {
    name: 'Criminal',
    talents: [
      { talent: 'Lockpicker', tier: 0 },
      { talent: 'Hustler', tier: 1 },
    ],
  },
  {
    name: 'Engineer',
    talents: [
      { talent: 'Tinker', tier: 0 },
      { talent: 'Overdrive', tier: 1 },
    ],
  },
]

describe('talentChoicesFor', () => {
  it('filters by tier and careers', () => {
    const got = talentChoicesFor(
      {
        kind: 'choose-talent',
        from: { tier: 0, careers: ['Field Medic', 'Criminal'] },
      },
      null,
      careers,
    )
    expect(got.map((t) => t.talent).sort()).toEqual(
      ['Anatomical Insight', 'First Aid Pro', 'Lockpicker'].sort(),
    )
  })

  it('respects CREATION_TALENT_MAX_TIER when no tier is given', () => {
    const got = talentChoicesFor(
      { kind: 'choose-talent', from: { careers: ['Field Medic'] } },
      null,
      careers,
    )
    // tiers 0 and 1 allowed; tier 2 Surgeon excluded
    expect(got.map((t) => t.talent)).toEqual([
      'Anatomical Insight',
      'First Aid Pro',
      'Combat Medic',
    ])
  })

  it('resolves primaryCareer against the active career', () => {
    const got = talentChoicesFor(
      { kind: 'choose-talent', from: { primaryCareer: true } },
      'Engineer',
      careers,
    )
    expect(got.map((t) => t.talent)).toEqual(['Tinker', 'Overdrive'])
  })

  it('returns empty when primaryCareer requested but none set', () => {
    const got = talentChoicesFor(
      { kind: 'choose-talent', from: { primaryCareer: true } },
      null,
      careers,
    )
    expect(got).toEqual([])
  })
})

describe('skillChoicesFor', () => {
  it('returns the explicit list when from is set', () => {
    expect(
      skillChoicesFor({
        kind: 'skill-choice',
        from: ['firearms', 'melee'],
        by: 2,
      }),
    ).toEqual(['firearms', 'melee'])
  })
  it('returns every skill when from is absent', () => {
    const ids = skillChoicesFor({ kind: 'skill-choice', by: 2 })
    expect(ids).toContain('survival')
    expect(ids.length).toBeGreaterThan(20)
  })
})

describe('attributeChoicesFor', () => {
  it('returns the explicit list when from is set', () => {
    expect(
      attributeChoicesFor({
        kind: 'attribute-choice',
        from: ['edu', 'per'],
        by: 1,
      }),
    ).toEqual(['edu', 'per'])
  })
  it('returns every attribute when from is absent', () => {
    const ids = attributeChoicesFor({ kind: 'attribute-choice', by: 1 })
    expect(ids).toEqual(['con', 'str', 'agi', 'int', 'edu', 'per', 'coo'])
  })
})

describe('bonusNeedsChoice', () => {
  const choiceKinds: BackgroundBonus[] = [
    { kind: 'choose-talent', from: {} },
    { kind: 'attribute-choice', by: 1 },
    { kind: 'skill-choice', by: 1 },
    { kind: 'one-of', options: [{ kind: 'credit-delta', by: 1 }] },
  ]
  const fixedKinds: BackgroundBonus[] = [
    { kind: 'grant-talent', talentId: 'Danger Sense' },
    { kind: 'attribute-bump', attribute: 'edu', by: 1 },
    { kind: 'skill-bump', skill: 'survival', by: 2 },
    { kind: 'asset-delta', by: 5 },
    { kind: 'credit-delta', by: 100 },
    { kind: 'max-health-bump', by: 1 },
    { kind: 'max-edge-bump', by: 1 },
    { kind: 'cyber-immunity-bump', by: 4 },
    { kind: 'skill-points-bonus', by: 3 },
  ]
  it.each(choiceKinds)('returns true for choice kind %j', (b) => {
    expect(bonusNeedsChoice(b)).toBe(true)
  })
  it.each(fixedKinds)('returns false for fixed kind %j', (b) => {
    expect(bonusNeedsChoice(b)).toBe(false)
  })
})

describe('resolveFixed', () => {
  it('echoes back every non-choice leaf', () => {
    const cases: LeafBonus[] = [
      { kind: 'grant-talent', talentId: 'Danger Sense' },
      { kind: 'attribute-bump', attribute: 'edu', by: 1 },
      { kind: 'skill-bump', skill: 'survival', by: 2 },
      { kind: 'asset-delta', by: -5 },
      { kind: 'credit-delta', by: 3000 },
      { kind: 'max-health-bump', by: 1 },
      { kind: 'max-edge-bump', by: 1 },
      { kind: 'cyber-immunity-bump', by: 4 },
      { kind: 'skill-points-bonus', by: 3 },
    ]
    for (const c of cases) expect(resolveFixed(c)).toEqual(c)
  })
  it('returns null for choice leaves', () => {
    expect(resolveFixed({ kind: 'choose-talent', from: {} })).toBeNull()
    expect(resolveFixed({ kind: 'attribute-choice', by: 1 })).toBeNull()
    expect(resolveFixed({ kind: 'skill-choice', by: 1 })).toBeNull()
  })
})

describe('projectResolvedBonuses', () => {
  it('aggregates every kind into the projection', () => {
    const resolved: ResolvedBonus[] = [
      { kind: 'attribute-bump', attribute: 'edu', by: 1 },
      { kind: 'attribute-choice', attribute: 'per', by: 1 },
      { kind: 'attribute-bump', attribute: 'edu', by: 1 }, // stacks
      { kind: 'skill-bump', skill: 'survival', by: 2 },
      { kind: 'skill-choice', skill: 'firearms', by: 2 },
      { kind: 'grant-talent', talentId: 'Danger Sense' },
      { kind: 'choose-talent', talentId: 'Lockpicker' },
      { kind: 'grant-talent', talentId: 'Danger Sense' }, // deduped
      { kind: 'asset-delta', by: 5 },
      { kind: 'asset-delta', by: -5 },
      { kind: 'credit-delta', by: 3000 },
      { kind: 'max-health-bump', by: 1 },
      { kind: 'max-edge-bump', by: 1 },
      { kind: 'cyber-immunity-bump', by: 4 },
      { kind: 'skill-points-bonus', by: 3 },
      { kind: 'skill-points-bonus', by: -3 },
    ]
    const got = projectResolvedBonuses(resolved)
    expect(got).toEqual({
      attributeDeltas: { edu: 2, per: 1 },
      skillDeltas: { survival: 2, firearms: 2 },
      grantedTalentNames: ['Danger Sense', 'Lockpicker'],
      assetDelta: 0,
      creditDelta: 3000,
      derivedStatBonuses: { maxHealth: 1, maxEdge: 1, cyberImmunity: 4 },
      skillPointsBonus: 0,
    })
  })

  it('produces an empty projection for an empty list', () => {
    expect(projectResolvedBonuses([])).toEqual(emptyProjection())
  })
})
