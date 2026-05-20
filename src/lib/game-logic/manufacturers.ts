import manufacturersData from '~/data/manufacturers.json'

export type ManufacturerEquipmentType = 'firearms' | 'melee' | 'armor'

/**
 * Per-equipment-type effect bundle. The text is the rulebook prose verbatim;
 * the structured fields are hand-extracted so the UI can act on them without
 * re-parsing free text. Defaults are zero / 1 (no adjustment).
 */
export interface ManufacturerTypeEffect {
  text: string
  modSlotAdjust: number
  costMultiplier: number
  extraCostFlat: number
  rarityAdjust: number
}

export interface ManufacturerData {
  name: string
  applicableTo: ManufacturerEquipmentType[]
  description: string
  companyDetails: string
  exampleProductNames: string[]
  effectsByType: Partial<
    Record<ManufacturerEquipmentType, ManufacturerTypeEffect>
  >
  hegemony: boolean
}

const ALL_MANUFACTURERS = manufacturersData as ManufacturerData[]
const BY_NAME = new Map(ALL_MANUFACTURERS.map((m) => [m.name, m]))

export function allManufacturers(): readonly ManufacturerData[] {
  return ALL_MANUFACTURERS
}

export function lookupManufacturer(name: string): ManufacturerData | undefined {
  return BY_NAME.get(name)
}

/** Manufacturers whose `applicableTo` includes the given equipment type. */
export function manufacturersFor(
  type: ManufacturerEquipmentType,
): ManufacturerData[] {
  return ALL_MANUFACTURERS.filter((m) => m.applicableTo.includes(type))
}

/** The effect bundle for the given equipment type, or undefined if the
 * manufacturer doesn't apply to that type. */
export function effectFor(
  manufacturer: ManufacturerData,
  type: ManufacturerEquipmentType,
): ManufacturerTypeEffect | undefined {
  return manufacturer.effectsByType[type]
}

/**
 * Resolve the effective cost of a base catalog item under a manufacturer.
 * Returns null when the base item has no cost (rare — most rulebook items
 * are priced). Result is rounded down for partial credit amounts.
 */
export function resolveManufacturedCost(
  baseCost: number | null,
  manufacturer: ManufacturerData | undefined,
  type: ManufacturerEquipmentType,
): number | null {
  if (baseCost == null) return null
  if (!manufacturer) return baseCost
  const effect = manufacturer.effectsByType[type]
  if (!effect) return baseCost
  return Math.floor(baseCost * effect.costMultiplier) + effect.extraCostFlat
}
