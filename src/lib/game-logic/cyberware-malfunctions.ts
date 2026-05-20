import malfunctionsData from '~/data/cyberware-malfunctions.json'

export interface MalfunctionSlot {
  roll: number
  outcome: string
  description: string
  repair: string
}

export type SeverityRange = 'central' | 'outer' | 'extreme'

const ALL_SLOTS = malfunctionsData as MalfunctionSlot[]
const LEGAL_ROLLS = new Set(ALL_SLOTS.map((s) => s.roll))

export function allMalfunctionSlots(): readonly MalfunctionSlot[] {
  return ALL_SLOTS
}

export interface MalfunctionGroup {
  outcome: string
  description: string
  repair: string
  severity: SeverityRange
  rolls: number[]
}

/**
 * Group consecutive slots that share an outcome (per the rulebook's forward-
 * fill: rolls 2/3/4 are all Critical Shutdown, etc.). Used by the allocation
 * UI to render one card per outcome with per-slot allocation controls inside.
 */
export function groupedMalfunctions(): MalfunctionGroup[] {
  const groups: MalfunctionGroup[] = []
  for (const s of ALL_SLOTS) {
    const last = groups[groups.length - 1]
    if (last && last.outcome === s.outcome) {
      last.rolls.push(s.roll)
    } else {
      groups.push({
        outcome: s.outcome,
        description: s.description,
        repair: s.repair,
        severity: severityOf(s.roll),
        rolls: [s.roll],
      })
    }
  }
  return groups
}

/** Rulebook severity bands. Central is mildest (15–25), extreme is catastrophic. */
export function severityOf(roll: number): SeverityRange {
  if (roll >= 15 && roll <= 25) return 'central'
  if ((roll >= 10 && roll <= 14) || (roll >= 26 && roll <= 30)) return 'outer'
  return 'extreme'
}

export const SEVERITY_LABEL: Record<SeverityRange, string> = {
  central: 'Mild',
  outer: 'Moderate',
  extreme: 'Severe',
}

export interface AllocationCheck {
  ok: boolean
  reason?: string
}

/**
 * Validate an allocation against the character's current excess. Rulebook:
 * "Any points that exceed the natural Cyber Immunity level must be allocated"
 * and the worked example shows one point per slot. So the array must have
 * exactly `excess` distinct slot numbers, each in the legal 2–40 set.
 */
export function validateAllocations(
  allocations: number[],
  excess: number,
): AllocationCheck {
  const seen = new Set<number>()
  for (const slot of allocations) {
    if (!Number.isInteger(slot)) {
      return { ok: false, reason: 'Allocation values must be whole numbers.' }
    }
    if (!LEGAL_ROLLS.has(slot)) {
      return {
        ok: false,
        reason: `Slot ${slot} is not a valid malfunction slot.`,
      }
    }
    if (seen.has(slot)) {
      return { ok: false, reason: `Slot ${slot} can only be selected once.` }
    }
    seen.add(slot)
  }
  if (seen.size !== excess) {
    return {
      ok: false,
      reason: `Allocated ${seen.size} slot${seen.size === 1 ? '' : 's'}; must allocate ${excess}.`,
    }
  }
  return { ok: true }
}

/** Deduplicate and sort by roll. */
export function normalizeAllocations(allocations: number[]): number[] {
  return Array.from(new Set(allocations)).sort((a, b) => a - b)
}
