import injuriesData from '~/data/injuries.json'
import type { InjuryEntry } from '~/lib/types/database'

/**
 * Catalog entry for an injury (the row in the rulebook injury table).
 * Carried injuries on a character are stored as {@link InjuryEntry} and
 * denormalize these fields onto themselves at apply time.
 */
export interface InjuryDef {
  name: string
  severity: number
  modifier: number
  effect: string
}

const INJURIES = injuriesData as InjuryDef[]

const MAX_SEVERITY = Math.max(...INJURIES.map((i) => i.severity))

/**
 * All injury catalog entries at the given severity row. Wound-symbol counts
 * higher than the table's max severity clamp to the top row ("draw a random
 * injury result from the table that corresponds with that amount of symbols"
 * — the table tops out at 7 = Instant Death).
 */
export function injuriesBySeverity(severity: number): InjuryDef[] {
  const row = Math.min(Math.max(severity, 1), MAX_SEVERITY)
  return INJURIES.filter((i) => i.severity === row)
}

/** Pick one random entry from the row matching the wound count. */
export function pickInjury(woundCount: number): InjuryDef | null {
  if (woundCount < 1) return null
  const candidates = injuriesBySeverity(woundCount)
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/**
 * Cumulative extra injury dice contributed by already-carried injuries
 * Treated injuries still count — treating only suppresses the immediate
 * effect.
 */
export function injuryEscalator(injuries: InjuryEntry[]): number {
  return injuries.reduce((sum, i) => sum + (i.modifier ?? 0), 0)
}

/** Build a fresh carried-injury record from a drawn catalog entry. */
export function makeInjuryEntry(def: InjuryDef): InjuryEntry {
  return {
    id: crypto.randomUUID(),
    name: def.name,
    severity: def.severity,
    modifier: def.modifier,
    treated: false,
    addedAt: new Date().toISOString(),
  }
}
