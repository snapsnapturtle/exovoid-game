import { describe, expect, it } from 'vitest'
import {
  DOWNTIME_ACTIVITIES,
  isActivityAvailable,
  relaxAndRestHealAmount,
  seekInspirationEdgeCap,
  trainableSkillIds,
} from './downtime'

describe('DOWNTIME_ACTIVITIES catalog', () => {
  it('contains the seven activities plus install-cyberware', () => {
    const ids = DOWNTIME_ACTIVITIES.map((a) => a.id).sort()
    expect(ids).toEqual([
      'forge-id',
      'install-cyberware',
      'modify-gear',
      'networking',
      'relax-and-rest',
      'repair-gear',
      'seek-inspiration',
      'train-skill',
    ])
  })

  it('only marks train-skill as oncePerLevel', () => {
    const gated = DOWNTIME_ACTIVITIES.filter((a) => a.oncePerLevel).map(
      (a) => a.id,
    )
    expect(gated).toEqual(['train-skill'])
  })
})

describe('isActivityAvailable', () => {
  const unlimited = DOWNTIME_ACTIVITIES.find((a) => a.id === 'relax-and-rest')!
  const gated = DOWNTIME_ACTIVITIES.find((a) => a.id === 'train-skill')!

  it('always returns true for non-gated activities', () => {
    expect(
      isActivityAvailable(unlimited, {
        level: 3,
        downtime_uses_used: { 'relax-and-rest': 3 },
      }),
    ).toBe(true)
  })

  it('returns true when the activity has never been used', () => {
    expect(
      isActivityAvailable(gated, { level: 3, downtime_uses_used: {} }),
    ).toBe(true)
  })

  it('returns false when used at the current level', () => {
    expect(
      isActivityAvailable(gated, {
        level: 3,
        downtime_uses_used: { 'train-skill': 3 },
      }),
    ).toBe(false)
  })

  it('re-opens once level ticks past the stored value', () => {
    expect(
      isActivityAvailable(gated, {
        level: 4,
        downtime_uses_used: { 'train-skill': 3 },
      }),
    ).toBe(true)
  })
})

describe('relaxAndRestHealAmount', () => {
  it('rounds up 20% of max health', () => {
    expect(relaxAndRestHealAmount(10)).toBe(2)
    expect(relaxAndRestHealAmount(11)).toBe(3)
    expect(relaxAndRestHealAmount(1)).toBe(1)
  })
})

describe('seekInspirationEdgeCap', () => {
  it('rounds up 150% of max edge', () => {
    expect(seekInspirationEdgeCap(4)).toBe(6)
    expect(seekInspirationEdgeCap(5)).toBe(8)
    expect(seekInspirationEdgeCap(0)).toBe(0)
  })
})

describe('trainableSkillIds', () => {
  it('returns skills with level <= 3 from the persisted map', () => {
    const result = trainableSkillIds({
      firearms: 5,
      medicine: 3,
      tech: 0,
      survival: 2,
    })
    expect(result).toContain('medicine')
    expect(result).toContain('survival')
    expect(result).toContain('tech')
    expect(result).not.toContain('firearms')
  })

  it('includes skills missing from the persisted map (default 0)', () => {
    // Empty skills blob → every SKILL is eligible. Previously the
    // implementation iterated the blob only, dropping unset skills.
    const result = trainableSkillIds({})
    expect(result).toContain('firearms')
    expect(result).toContain('tech')
    expect(result).toContain('xenology')
  })

  it('excludes skills past the cap even when other skills are missing', () => {
    expect(trainableSkillIds({ firearms: 5 })).not.toContain('firearms')
  })
})
