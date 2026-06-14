import { describe, expect, it } from 'vitest'
import { parseQuality } from './weapons'

describe('parseQuality', () => {
  it('splits a name and a numeric annotation', () => {
    expect(parseQuality('Concealed (1)')).toEqual({
      name: 'Concealed',
      annotation: '1',
    })
  })

  it('returns a null annotation for a bare name', () => {
    expect(parseQuality('Silenced')).toEqual({
      name: 'Silenced',
      annotation: null,
    })
  })

  it('keeps non-numeric annotations intact (e.g. Throwable ranges)', () => {
    // The bracket is a throw range here, not a level — it must not break the
    // base-name extraction used for the catalog lookup.
    expect(parseQuality('Throwable (2-8 | 15)')).toEqual({
      name: 'Throwable',
      annotation: '2-8 | 15',
    })
  })

  it('handles an annotation that contains a comma', () => {
    expect(parseQuality('Defensive (1, Melee)')).toEqual({
      name: 'Defensive',
      annotation: '1, Melee',
    })
  })
})
