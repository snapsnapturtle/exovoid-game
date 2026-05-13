import type { CharacterAttributes, TalentEntry } from '~/lib/types/database'
import type { AttributeId } from '~/lib/game-logic/attributes'
import {
  computeAllDerivedStats,
  type DerivedStats,
} from '~/lib/game-logic/derived-stats'
import talentsData from '~/data/talents.json'

export type DerivedStatId = keyof DerivedStats

export type TalentEffect =
  | { kind: 'attribute'; attr: AttributeId; value: number }
  | { kind: 'derivedStat'; stat: DerivedStatId; value: number }

interface TalentMeta {
  name: string
  description: string
  effects?: TalentEffect[]
}

const ALL_TALENTS = talentsData as TalentMeta[]
const EFFECTS_BY_NAME = new Map(
  ALL_TALENTS.filter((t) => t.effects?.length).map((t) => [t.name, t.effects!]),
)

const MAX_ATTRIBUTE = 8

export interface Contribution {
  source: string
  value: number
}

export interface AppliedTalentEffects {
  baseAttributes: CharacterAttributes
  attributes: CharacterAttributes
  derived: DerivedStats
  attributeContributions: Partial<Record<AttributeId, Contribution[]>>
  derivedContributions: Partial<Record<DerivedStatId, Contribution[]>>
}

export function applyPassiveTalentEffects(
  baseAttributes: CharacterAttributes,
  talents: TalentEntry[],
): AppliedTalentEffects {
  const attributes: CharacterAttributes = { ...baseAttributes }
  const attributeContributions: Partial<Record<AttributeId, Contribution[]>> = {}
  const derivedContributions: Partial<Record<DerivedStatId, Contribution[]>> = {}

  // Pass 1: apply attribute deltas first so derived stats see the new base.
  for (const t of talents) {
    const effects = EFFECTS_BY_NAME.get(t.name)
    if (!effects) continue
    for (const eff of effects) {
      if (eff.kind !== 'attribute') continue
      const next = Math.min(MAX_ATTRIBUTE, attributes[eff.attr] + eff.value)
      const applied = next - attributes[eff.attr]
      attributes[eff.attr] = next
      if (applied !== 0) {
        const list = attributeContributions[eff.attr] ?? []
        list.push({ source: t.name, value: applied })
        attributeContributions[eff.attr] = list
      }
    }
  }

  // Recompute derived from modified attributes.
  const derived: DerivedStats = { ...computeAllDerivedStats(attributes) }

  // Pass 2: apply derived stat deltas on top.
  for (const t of talents) {
    const effects = EFFECTS_BY_NAME.get(t.name)
    if (!effects) continue
    for (const eff of effects) {
      if (eff.kind !== 'derivedStat') continue
      derived[eff.stat] = derived[eff.stat] + eff.value
      const list = derivedContributions[eff.stat] ?? []
      list.push({ source: t.name, value: eff.value })
      derivedContributions[eff.stat] = list
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
