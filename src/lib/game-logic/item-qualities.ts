import qualitiesData from '~/data/item-qualities.json'

export type QualityType = 'Item Quality' | 'Trigger Option'

export interface ItemQuality {
  type: QualityType
  name: string
  effect: string
}

const ALL_QUALITIES = qualitiesData as ItemQuality[]
const BY_NAME = new Map(ALL_QUALITIES.map((q) => [q.name, q]))

export function lookupQuality(name: string): ItemQuality | undefined {
  return BY_NAME.get(name)
}
