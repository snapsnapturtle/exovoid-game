import type { CharacterAttributes, TalentEntry } from '~/lib/types/domain'
import {
  ATTRIBUTE_DEFINITIONS,
  CREATION_HIGH_CAP,
  CREATION_HIGH_COUNT,
  CREATION_LOW_CAP,
  MAX_ATTRIBUTE_LEVEL,
  TOTAL_ATTRIBUTE_POINTS,
} from './attributes'
import { MAX_SKILL_LEVEL, SKILLS } from './skills'
import { isLegalTalentSet, type CareerData } from './talents'

/**
 * Shared creation-time validation used by both the wizard (for inline
 * step gating + error display) and the createCharacter server function
 * (for authoritative checks before insert).
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
 * Total 28 points; three attributes capped at 6, the other four at 4.
 * We don't track which 3 are "the high-cap ones" — instead
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
 * 30 skill points to spend on top of career baseline; no skill above 6;
 * levels 5 and 6 cost 2 points each. Career baseline is free.
 * Final skill values cannot go below the baseline (the player can't
 * downgrade what the career grants).
 */
export function validateCreationSkills(
  finalSkills: Record<string, number>,
  careerBaseline: Record<string, number>,
  budget: number = CREATION_SKILL_POINTS,
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
  if (pointsSpent > budget) {
    errors.push(`Spent ${pointsSpent} skill points; budget is ${budget}.`)
  }
  return errors.length === 0 ? valid() : invalid(...errors)
}

/**
 * Up to 2 starting talents from the chosen career's tree, with normal
 * tier prereqs (a tier-1 talent needs a tier-0 prereq from the
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
  // Granted talents (background bonuses, etc.) bypass the limit and the
  // career-tree / tier-prereq checks — same exemption `canRemove` makes.
  const careerTalents = talents.filter((t) => !t.granted)
  if (careerTalents.length > CREATION_TALENT_LIMIT) {
    errors.push(
      `Picked ${careerTalents.length} starting talents; limit is ${CREATION_TALENT_LIMIT}.`,
    )
  }
  const talentSet: { talent: string; tier: number }[] = []
  for (const t of careerTalents) {
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

/**
 * When background bonuses bump an attribute past the creation cap of 6,
 * we still need to validate the *base* allocation (28 points + 6/4 caps)
 * separately from the final value. The final only needs to fit the
 * lifetime ceiling (0 ≤ x ≤ 8) — bumps above 6 are legal per rulebook
 * §Attributes ("after this step, the attributes may still increase
 * through other parts of the creation process").
 */
export function validateCreationAttributesWithBonus(
  base: CharacterAttributes,
  final: CharacterAttributes,
): ValidationResult {
  const errors: string[] = []
  // Base must respect the 28-point budget and per-attribute creation caps.
  const baseResult = validateCreationAttributes(base)
  errors.push(...baseResult.errors)
  // Final must stay within the lifetime ceiling.
  for (const a of ATTRIBUTE_DEFINITIONS) {
    const v = final[a.id]
    if (!Number.isInteger(v) || v < 0) {
      errors.push(`${a.name} (after bonuses) must be a non-negative integer.`)
    } else if (v > MAX_ATTRIBUTE_LEVEL) {
      errors.push(
        `${a.name} (after bonuses) is ${v}; lifetime ceiling is ${MAX_ATTRIBUTE_LEVEL}.`,
      )
    }
  }
  return errors.length === 0 ? valid() : invalid(...errors)
}

/**
 * Same shape for skills: the base (career baseline + spent points) must
 * fit the 30-point budget + ≤ 6 creation cap; the final (base + bonus
 * bumps) only has to fit 0..MAX_SKILL_LEVEL.
 */
export function validateCreationSkillsWithBonus(
  baseFinal: Record<string, number>,
  careerBaseline: Record<string, number>,
  finalAfterBonus: Record<string, number>,
  budget: number = CREATION_SKILL_POINTS,
): ValidationResult {
  const errors: string[] = []
  const baseResult = validateCreationSkills(baseFinal, careerBaseline, budget)
  errors.push(...baseResult.errors)
  for (const skill of SKILLS) {
    const v = finalAfterBonus[skill.id] ?? 0
    if (!Number.isInteger(v) || v < 0) {
      errors.push(
        `${skill.name} (after bonuses) must be a non-negative integer.`,
      )
      continue
    }
    if (v > MAX_SKILL_LEVEL) {
      errors.push(
        `${skill.name} (after bonuses) is ${v}; lifetime ceiling is ${MAX_SKILL_LEVEL}.`,
      )
      continue
    }
    // The creation cap (6) applies to the final value, with one carve-out:
    // a background can force the final past 6 if the *unavoidable* portion
    // (career baseline + background bonus) is already past it. In that
    // case the player must not have spent any points on top — that
    // shorter rule catches both "no carve-out" and "carve-out exceeded".
    if (v > CREATION_SKILL_MAX) {
      const career = careerBaseline[skill.id] ?? 0
      const spent = (baseFinal[skill.id] ?? 0) - career
      if (spent > 0) {
        errors.push(
          `${skill.name} is ${v}; creation cap is ${CREATION_SKILL_MAX} when spending on top of background bonuses.`,
        )
      }
    }
  }
  return errors.length === 0 ? valid() : invalid(...errors)
}

export interface CreationInput {
  careerName: string
  attributes: CharacterAttributes
  finalSkills: Record<string, number>
  talents: TalentEntry[]
  /** Pre-bonus attributes — base 28-point allocation. Omit when no bonuses applied. */
  baseAttributes?: CharacterAttributes
  /** Pre-bonus final skills (career baseline + spent points). Omit when no bonuses applied. */
  baseFinalSkills?: Record<string, number>
  /**
   * Effective skill-point budget, including background `skill-points-bonus`
   * shifts. Defaults to `CREATION_SKILL_POINTS` for back-compat.
   */
  skillPointsBudget?: number
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
  const attrResult = input.baseAttributes
    ? validateCreationAttributesWithBonus(
        input.baseAttributes,
        input.attributes,
      )
    : validateCreationAttributes(input.attributes)
  const skillResult = input.baseFinalSkills
    ? validateCreationSkillsWithBonus(
        input.baseFinalSkills,
        baseline,
        input.finalSkills,
        input.skillPointsBudget,
      )
    : validateCreationSkills(
        input.finalSkills,
        baseline,
        input.skillPointsBudget,
      )
  return merge(
    attrResult,
    skillResult,
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
