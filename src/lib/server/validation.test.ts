import { describe, expect, it } from 'vitest'
import {
  attributesSchema,
  jsonSchema,
  ownerSchema,
  rollPoolSchema,
  uuidSchema,
} from './validation'

const UUID = '00000000-0000-4000-8000-000000000000'

describe('uuidSchema', () => {
  it('accepts a uuid and rejects garbage', () => {
    expect(uuidSchema.safeParse(UUID).success).toBe(true)
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
    expect(uuidSchema.safeParse(42).success).toBe(false)
  })
})

describe('attributesSchema', () => {
  const valid = { con: 4, str: 4, agi: 4, int: 4, edu: 4, per: 4, coo: 4 }

  it('accepts the 7-attribute shape', () => {
    expect(attributesSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a missing attribute or a non-integer value', () => {
    const { con: _drop, ...missing } = valid
    void _drop
    expect(attributesSchema.safeParse(missing).success).toBe(false)
    expect(attributesSchema.safeParse({ ...valid, str: 2.5 }).success).toBe(
      false,
    )
    expect(attributesSchema.safeParse({ ...valid, str: 'big' }).success).toBe(
      false,
    )
  })

  it('strips unknown keys rather than forwarding them', () => {
    const parsed = attributesSchema.parse({ ...valid, hacked: 99 })
    expect(parsed).not.toHaveProperty('hacked')
  })
})

describe('ownerSchema', () => {
  it('discriminates character vs game owners', () => {
    expect(
      ownerSchema.safeParse({ type: 'character', characterId: UUID }).success,
    ).toBe(true)
    expect(ownerSchema.safeParse({ type: 'game', gameId: UUID }).success).toBe(
      true,
    )
  })

  it('rejects an unknown owner type or a mismatched id field', () => {
    expect(ownerSchema.safeParse({ type: 'ship', shipId: UUID }).success).toBe(
      false,
    )
    expect(
      ownerSchema.safeParse({ type: 'character', gameId: UUID }).success,
    ).toBe(false)
  })
})

describe('rollPoolSchema', () => {
  it('accepts a partial pool and drops unknown die types', () => {
    expect(rollPoolSchema.safeParse({ standard: 3 }).success).toBe(true)
    expect(rollPoolSchema.parse({ standard: 3, d20: 5 })).toEqual({
      standard: 3,
    })
  })

  it('rejects negative or non-integer counts', () => {
    expect(rollPoolSchema.safeParse({ standard: -1 }).success).toBe(false)
    expect(rollPoolSchema.safeParse({ standard: 1.5 }).success).toBe(false)
  })
})

describe('jsonSchema', () => {
  it('accepts nested JSON values', () => {
    expect(
      jsonSchema.safeParse({ skills: { firearms: 2 }, banked: true }).success,
    ).toBe(true)
    expect(jsonSchema.safeParse([1, 'two', null, { a: 1 }]).success).toBe(true)
  })

  it('rejects non-JSON values', () => {
    expect(jsonSchema.safeParse(undefined).success).toBe(false)
    expect(jsonSchema.safeParse(() => 1).success).toBe(false)
    expect(jsonSchema.safeParse(NaN).success).toBe(false)
  })
})
