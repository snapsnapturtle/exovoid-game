import type {
  CharacterAttributes,
  CyberwareEntry,
  InventoryItem,
  TalentEntry,
} from '~/lib/types/database'
import type { AttributeId } from '~/lib/game-logic/attributes'
import {
  computeAllDerivedStats,
  type DerivedStats,
} from '~/lib/game-logic/derived-stats'
import { effectiveArmorSoak, equippedArmor } from '~/lib/game-logic/armors'
import talentsData from '~/data/talents.json'
import cyberwareData from '~/data/cyberware.json'

export type DerivedStatId = keyof DerivedStats

export type PassiveEffect =
  | { kind: 'attribute'; attr: AttributeId; value: number }
  | { kind: 'derivedStat'; stat: DerivedStatId; value: number }

interface PassiveSource {
  name: string
  description: string
  effects?: PassiveEffect[]
}

const ALL_TALENTS = talentsData as PassiveSource[]
const ALL_CYBERWARE = cyberwareData as PassiveSource[]

const TALENT_EFFECTS = new Map(
  ALL_TALENTS.filter((t) => t.effects?.length).map((t) => [t.name, t.effects!]),
)
const CYBERWARE_EFFECTS = new Map(
  ALL_CYBERWARE.filter((c) => c.effects?.length).map((c) => [
    c.name,
    c.effects!,
  ]),
)

const MAX_ATTRIBUTE = 8

export interface Contribution {
  source: string
  value: number
}

export interface AppliedPassiveEffects {
  baseAttributes: CharacterAttributes
  attributes: CharacterAttributes
  derived: DerivedStats
  attributeContributions: Partial<Record<AttributeId, Contribution[]>>
  derivedContributions: Partial<Record<DerivedStatId, Contribution[]>>
}

interface SourceWithEffects {
  name: string
  effects: PassiveEffect[]
}

function collectSources(
  talents: TalentEntry[],
  cyberware: CyberwareEntry[],
): SourceWithEffects[] {
  const out: SourceWithEffects[] = []
  for (const t of talents) {
    const eff = TALENT_EFFECTS.get(t.name)
    if (eff) out.push({ name: t.name, effects: eff })
  }
  for (const c of cyberware) {
    const eff = CYBERWARE_EFFECTS.get(c.name)
    if (eff) out.push({ name: c.name, effects: eff })
  }
  return out
}

export function applyPassiveEffects(
  baseAttributes: CharacterAttributes,
  talents: TalentEntry[],
  cyberware: CyberwareEntry[],
  inventory: InventoryItem[] = [],
): AppliedPassiveEffects {
  const attributes: CharacterAttributes = { ...baseAttributes }
  const attributeContributions: Partial<Record<AttributeId, Contribution[]>> =
    {}
  const derivedContributions: Partial<Record<DerivedStatId, Contribution[]>> =
    {}
  const sources = collectSources(talents, cyberware)

  for (const source of sources) {
    for (const eff of source.effects) {
      if (eff.kind !== 'attribute') continue
      const next = Math.min(MAX_ATTRIBUTE, attributes[eff.attr] + eff.value)
      const applied = next - attributes[eff.attr]
      attributes[eff.attr] = next
      if (applied !== 0) {
        const list = attributeContributions[eff.attr] ?? []
        list.push({ source: source.name, value: applied })
        attributeContributions[eff.attr] = list
      }
    }
  }

  const derived: DerivedStats = { ...computeAllDerivedStats(attributes) }

  for (const source of sources) {
    for (const eff of source.effects) {
      if (eff.kind !== 'derivedStat') continue
      derived[eff.stat] = derived[eff.stat] + eff.value
      const list = derivedContributions[eff.stat] ?? []
      list.push({ source: source.name, value: eff.value })
      derivedContributions[eff.stat] = list
    }
  }

  // Equipped armor closes the `soak: 0` hardcode in computeAllDerivedStats —
  // primary while durability > 0, secondary once it's depleted.
  const worn = equippedArmor(inventory)
  if (worn) {
    const value = effectiveArmorSoak(worn.entry, worn.data)
    if (value > 0) {
      derived.soak += value
      const list = derivedContributions.soak ?? []
      list.push({ source: worn.entry.name, value })
      derivedContributions.soak = list
    }
  }

  return {
    baseAttributes,
    attributes,
    derived,
    attributeContributions,
    derivedContributions,
  }
}
