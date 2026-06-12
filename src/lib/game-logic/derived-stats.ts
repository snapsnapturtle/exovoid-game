import type { CharacterAttributes } from '~/lib/types/domain'

/** All division uses Math.ceil (round up) per game table ruling */

export function computeHealth(attrs: CharacterAttributes): number {
  return 5 + attrs.con
}

export function computeVigilance(attrs: CharacterAttributes): number {
  return 3 + Math.ceil((attrs.int + attrs.coo) / 3)
}

export function computeHeft(attrs: CharacterAttributes): number {
  return Math.ceil(attrs.str / 2)
}

export function computeEdge(attrs: CharacterAttributes): number {
  return 3 + Math.ceil(attrs.coo / 4) + Math.ceil(attrs.edu / 2)
}

/**
 * Hard ceiling on Edge — used by the +/- trackers to bound how far the
 * value can be pushed past the normal max. Per the Seek Inspiration
 * downtime entry: "a character cannot exceed their edge limit by more
 * than 50% in this way." Rounded up to match the rest of the derived
 * stats.
 */
export function edgeCap(edgeMax: number): number {
  return Math.ceil(edgeMax * 1.5)
}

export function computeActionPoints(attrs: CharacterAttributes): number {
  return 3 + Math.ceil(attrs.agi / 2)
}

export function computeSpeed(attrs: CharacterAttributes): number {
  return 3 + Math.ceil((attrs.con + attrs.agi) / 2)
}

export function computeCyberImmunity(attrs: CharacterAttributes): number {
  return attrs.con + attrs.str
}

export interface DerivedStats {
  health: number
  vigilance: number
  heft: number
  edge: number
  actionPoints: number
  speed: number
  cyberImmunity: number
  soak: number
}

export function computeAllDerivedStats(
  attrs: CharacterAttributes,
): DerivedStats {
  return {
    health: computeHealth(attrs),
    vigilance: computeVigilance(attrs),
    heft: computeHeft(attrs),
    edge: computeEdge(attrs),
    actionPoints: computeActionPoints(attrs),
    speed: computeSpeed(attrs),
    cyberImmunity: computeCyberImmunity(attrs),
    soak: 0,
  }
}
