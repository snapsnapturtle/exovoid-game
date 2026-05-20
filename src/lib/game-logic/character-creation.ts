import type { CharacterAttributes, TalentEntry } from '~/lib/types/database'
import {
  ATTRIBUTE_DEFINITIONS,
  CREATION_HIGH_CAP,
  CREATION_HIGH_COUNT,
  CREATION_LOW_CAP,
  TOTAL_ATTRIBUTE_POINTS,
} from './attributes'
import { SKILLS } from './skills'
import { isLegalTalentSet, type CareerData } from './talents'

/**
 * Shared creation-time validation used by both the wizard (for inline
 * step gating + error display) and the createCharacter server function
 * (for authoritative checks before insert). Rules per §162 / §176 of
 * the rulebook.
 *
 * NOTE: these rules apply only at *creation*. Once the character exists,
 * attributes can climb past the 4/6 caps via training talents, etc., and
 * skill points come from leveling — so the regular updateCharacter path
 * must NOT call these.
 */

export const CREATION_SKILL_POINTS = 30
export const CREATION_SKILL_MAX = 6
export const CREATION_TALENT_LIMIT = 2
export const CREATION_TALENT_MAX_TIER = 1

export function pointsForSkillLevel(level: number): number {
  if (level <= 4) return level
  return 4 + (level - 4) * 2
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

function valid(): ValidationResult {
  return { ok: true, errors: [] }
}
function invalid(...errors: string[]): ValidationResult {
  return { ok: false, errors }
}
function merge(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors)
  return { ok: errors.length === 0, errors }
}

/**
 * §162-163: total 28 points; three attributes capped at 6, the other
 * four at 4. We don't track which 3 are "the high-cap ones" — instead
 * we infer from the final values: any attribute > 4 must be one of the
 * three high-cap slots, so the count of those can be at most 3.
 */
export function validateCreationAttributes(
  attrs: CharacterAttributes,
): ValidationResult {
  const errors: string[] = []
  for (const a of ATTRIBUTE_DEFINITIONS) {
    const v = attrs[a.id]
    if (!Number.isInteger(v) || v < 0) {
      errors.push(`${a.name} must be a non-negative integer.`)
    } else if (v > CREATION_HIGH_CAP) {
      errors.push(`${a.name} is ${v}; creation cap is ${CREATION_HIGH_CAP}.`)
    }
  }
  const total = ATTRIBUTE_DEFINITIONS.reduce(
    (sum, a) => sum + (attrs[a.id] ?? 0),
    0,
  )
  if (total !== TOTAL_ATTRIBUTE_POINTS) {
    errors.push(
      `Attribute total is ${total}; must be exactly ${TOTAL_ATTRIBUTE_POINTS}.`,
    )
  }
  const highCapUsed = ATTRIBUTE_DEFINITIONS.filter(
    (a) => (attrs[a.id] ?? 0) > CREATION_LOW_CAP,
  ).length
  if (highCapUsed > CREATION_HIGH_COUNT) {
    errors.push(
      `${highCapUsed} attributes are above ${CREATION_LOW_CAP}; only ${CREATION_HIGH_COUNT} may exceed the low cap at creation.`,
    )
  }
  return errors.length === 0 ? valid() : invalid(...errors)
}

/**
 * §176: 30 skill points to spend on top of career baseline; no skill
 * above 6; levels 5 and 6 cost 2 points each. Career baseline is free.
 * Final skill values cannot go below the baseline (the player can't
 * downgrade what the career grants).
 */
export function validateCreationSkills(
  finalSkills: Record<string, number>,
  careerBaseline: Record<string, number>,
): ValidationResult {
  const errors: string[] = []
  let pointsSpent = 0
  for (const skill of SKILLS) {
    const base = careerBaseline[skill.id] ?? 0
    const final = finalSkills[skill.id] ?? 0
    if (!Number.isInteger(final) || final < 0) {
      errors.push(`${skill.name} must be a non-negative integer.`)
      continue
    }
    if (final > CREATION_SKILL_MAX) {
      errors.push(
        `${skill.name} is ${final}; creation cap is ${CREATION_SKILL_MAX}.`,
      )
    }
    if (final < base) {
      errors.push(`${skill.name} is below the career baseline of ${base}.`)
    }
    pointsSpent += pointsForSkillLevel(final) - pointsForSkillLevel(base)
  }
  if (pointsSpent > CREATION_SKILL_POINTS) {
    errors.push(
      `Spent ${pointsSpent} skill points; budget is ${CREATION_SKILL_POINTS}.`,
    )
  }
  return errors.length === 0 ? valid() : invalid(...errors)
}

/**
 * §155: up to 2 starting talents from the chosen career's tree, with
 * normal tier prereqs (a tier-1 talent needs a tier-0 prereq from the
 * same career). At creation only tier 0 and 1 are reachable — picking
 * a higher tier would require more prereq slots than we have.
 */
export function validateCreationTalents(
  talents: TalentEntry[],
  careerName: string,
  careerData: CareerData | undefined,
): ValidationResult {
  if (!careerData) {
    return invalid(`Career "${careerName}" not found in catalog.`)
  }
  const errors: string[] = []
  if (talents.length > CREATION_TALENT_LIMIT) {
    errors.push(
      `Picked ${talents.length} starting talents; limit is ${CREATION_TALENT_LIMIT}.`,
    )
  }
  const talentSet: { talent: string; tier: number }[] = []
  for (const t of talents) {
    const ref = careerData.talents.find((ct) => ct.talent === t.name)
    if (!ref) {
      errors.push(`Talent "${t.name}" is not part of the ${careerName} tree.`)
      continue
    }
    if (ref.tier > CREATION_TALENT_MAX_TIER) {
      errors.push(
        `Talent "${t.name}" is tier ${ref.tier}; only tier 0–${CREATION_TALENT_MAX_TIER} at creation.`,
      )
    }
    talentSet.push({ talent: ref.talent, tier: ref.tier })
  }
  if (!isLegalTalentSet(talentSet)) {
    errors.push(
      'Talent prerequisites unmet — a higher-tier talent lacks its lower-tier prereq.',
    )
  }
  return errors.length === 0 ? valid() : invalid(...errors)
}

export interface CreationInput {
  careerName: string
  attributes: CharacterAttributes
  finalSkills: Record<string, number>
  talents: TalentEntry[]
}

/** Compose every check for a single submit-time validation pass. */
export function validateCreation(
  input: CreationInput,
  allCareers: CareerData[],
): ValidationResult {
  const career = allCareers.find((c) => c.name === input.careerName)
  if (!career) {
    return invalid(`Career "${input.careerName}" not found in catalog.`)
  }
  const baseline = careerSkillBaseline(career)
  return merge(
    validateCreationAttributes(input.attributes),
    validateCreationSkills(input.finalSkills, baseline),
    validateCreationTalents(input.talents, input.careerName, career),
  )
}

/** Build the career's starting-skill baseline map keyed by skill id. */
export function careerSkillBaseline(
  career: CareerData,
): Record<string, number> {
  const byName = new Map<string, string>()
  for (const skill of SKILLS) byName.set(skill.name.toLowerCase(), skill.id)
  const out: Record<string, number> = {}
  for (const s of career.startingSkills ?? []) {
    const id = byName.get(s.name.toLowerCase())
    if (id) out[id] = s.level
  }
  return out
}
