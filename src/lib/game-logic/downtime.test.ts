import { describe, expect, it } from 'vitest'
import type { ProgressionEntry } from '~/lib/types/database'
import {
  DOWNTIME_ACTIVITIES,
  isActivityAvailable,
  relaxAndRestHealAmount,
  seekInspirationEdgeCap,
  trainSkillUsesRemaining,
  trainableSkillIds,
} from './downtime'

function trainSkillRow(
  level: number,
  id = `r${Math.random()}`,
): ProgressionEntry {
  return {
    id,
    character_id: 'c1',
    level,
    source: 'downtime:train-skill',
    picks: { skillId: 'firearms' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

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

  it('has no oncePerLevel activities — train-skill uses the lifetime cap instead', () => {
    const gated = DOWNTIME_ACTIVITIES.filter((a) => a.oncePerLevel).map(
      (a) => a.id,
    )
    expect(gated).toEqual([])
  })
})

describe('isActivityAvailable', () => {
  const unlimited = DOWNTIME_ACTIVITIES.find((a) => a.id === 'relax-and-rest')!
  const trainSkill = DOWNTIME_ACTIVITIES.find((a) => a.id === 'train-skill')!

  it('always returns true for non-gated activities', () => {
    expect(
      isActivityAvailable(unlimited, {
        level: 3,
        downtime_uses_used: { 'relax-and-rest': 3 },
      }),
    ).toBe(true)
  })

  it('returns true for train-skill when no trainings have been recorded', () => {
    expect(
      isActivityAvailable(trainSkill, { level: 3, downtime_uses_used: {} }, []),
    ).toBe(true)
  })

  it('returns true for train-skill when used fewer times than the level cap', () => {
    expect(
      isActivityAvailable(trainSkill, { level: 3, downtime_uses_used: {} }, [
        trainSkillRow(2),
        trainSkillRow(3),
      ]),
    ).toBe(true)
  })

  it('returns false for train-skill once the lifetime cap is hit', () => {
    expect(
      isActivityAvailable(trainSkill, { level: 3, downtime_uses_used: {} }, [
        trainSkillRow(2),
        trainSkillRow(2),
        trainSkillRow(3),
      ]),
    ).toBe(false)
  })

  it('re-opens train-skill once the character levels up past the used count', () => {
    expect(
      isActivityAvailable(trainSkill, { level: 4, downtime_uses_used: {} }, [
        trainSkillRow(2),
        trainSkillRow(3),
        trainSkillRow(3),
      ]),
    ).toBe(true)
  })
})

describe('trainSkillUsesRemaining', () => {
  it('returns the character level when nothing has been trained yet', () => {
    expect(trainSkillUsesRemaining(3, [])).toBe(3)
  })

  it('subtracts every train-skill row regardless of which level it was used at', () => {
    expect(
      trainSkillUsesRemaining(4, [
        trainSkillRow(1),
        trainSkillRow(2),
        trainSkillRow(2),
      ]),
    ).toBe(1)
  })

  it('clamps at zero when the cap has been exceeded (data drift)', () => {
    expect(
      trainSkillUsesRemaining(1, [trainSkillRow(1), trainSkillRow(1)]),
    ).toBe(0)
  })

  it('ignores other progression sources', () => {
    const otherRow: ProgressionEntry = {
      id: 'lu',
      character_id: 'c1',
      level: 2,
      source: 'level-up',
      picks: { skills: { firearms: 1 }, talent: null },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(trainSkillUsesRemaining(2, [otherRow])).toBe(2)
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
