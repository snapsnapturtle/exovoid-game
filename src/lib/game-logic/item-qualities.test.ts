import { describe, expect, it } from 'vitest'
import { ALL_QUALITIES, lookupQuality } from './item-qualities'

describe('item-qualities catalog', () => {
  it('has no duplicate type:name keys', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const q of ALL_QUALITIES) {
      const key = `${q.type}:${q.name}`
      if (seen.has(key)) dupes.push(key)
      seen.add(key)
    }
    expect(dupes).toEqual([])
  })
})

describe('lookupQuality', () => {
  it('disambiguates a name shared across types by the type argument', () => {
    // "Injuring" exists both as an Item Quality and a Trigger Option with
    // different effect text — keying by name alone shadowed one of them.
    const itemQuality = lookupQuality('Injuring', 'Item Quality')
    const triggerOption = lookupQuality('Injuring', 'Trigger Option')

    expect(itemQuality?.type).toBe('Item Quality')
    expect(triggerOption?.type).toBe('Trigger Option')
    expect(itemQuality?.effect).not.toBe(triggerOption?.effect)
  })

  it('falls back to the other type when the requested type has no match', () => {
    // "Loud" only exists as an Item Quality; asking for a trigger option
    // should still resolve it.
    const asTrigger = lookupQuality('Loud', 'Trigger Option')
    expect(asTrigger?.type).toBe('Item Quality')
    expect(asTrigger?.name).toBe('Loud')
  })

  it('resolves a name without a type argument', () => {
    expect(lookupQuality('Loud')?.name).toBe('Loud')
  })

  it('resolves the firing-mode short names to their catalog entries', () => {
    // Weapons list these as "Burst (5)" / "Full Auto (18)", but the rulebook
    // files them under "Firing Mode: …".
    expect(lookupQuality('Burst')?.name).toBe('Firing Mode: Burst')
    expect(lookupQuality('Full Auto')?.name).toBe('Firing Mode: Full Auto')
  })

  it('returns undefined for an unknown name', () => {
    expect(lookupQuality('Nonexistent')).toBeUndefined()
  })
})
