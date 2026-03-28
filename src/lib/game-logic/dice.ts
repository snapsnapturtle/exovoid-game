import type { CharacterAttributes } from '~/lib/types/database'
import type { AttributeId } from './attributes'

export interface DicePool {
  standard: number
  aptitude: number
  expertise: number
  total: number
}

/**
 * Compute the attribute average for a skill check.
 * Per rules: average of linked attributes, rounded up (ceil).
 */
export function computeAttributeAverage(
  attrs: CharacterAttributes,
  linkedAttributes: AttributeId[],
): number {
  const sum = linkedAttributes.reduce((s, attrId) => s + attrs[attrId], 0)
  return Math.ceil(sum / linkedAttributes.length)
}

/**
 * Compute the dice pool for a skill check.
 *
 * Rules:
 * - Always 1 standard die
 * - The higher of (attribute average, skill level) determines total pool dice
 * - The lower determines how many become expertise dice (if skill > 0)
 * - The remainder are aptitude dice
 */
export function computeDicePool(attrAvg: number, skillLevel: number): DicePool {
  if (skillLevel === 0) {
    return {
      standard: 1,
      aptitude: attrAvg,
      expertise: 0,
      total: 1 + attrAvg,
    }
  }

  const higher = Math.max(attrAvg, skillLevel)
  const lower = Math.min(attrAvg, skillLevel)

  return {
    standard: 1,
    aptitude: higher - lower,
    expertise: lower,
    total: 1 + higher,
  }
}
