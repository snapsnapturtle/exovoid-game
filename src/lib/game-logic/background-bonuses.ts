import type { AttributeId } from './attributes'
import { ATTRIBUTE_DEFINITIONS } from './attributes'
import { SKILLS } from './skills'
import { CREATION_TALENT_MAX_TIER } from './character-creation'
import type { CareerData } from './talents'

export type SkillId = string

/**
 * A single mechanisable effect from a background entry. Annotated alongside
 * the textual `bonus` string in `src/data/backgrounds.json`; the textual
 * string remains the canonical narrative description and continues to be
 * dumped into `background_notes`.
 *
 * Leaves are flat; the `one-of` wrapper composes them (one level deep —
 * never nest `one-of` inside `one-of`).
 */
export type LeafBonus =
  | { kind: 'grant-talent'; talentId: string }
  | {
      kind: 'choose-talent'
      from: { tier?: number; careers?: string[]; primaryCareer?: true }
    }
  | { kind: 'attribute-bump'; attribute: AttributeId; by: number }
  | { kind: 'attribute-choice'; from?: AttributeId[]; by: number }
  | { kind: 'skill-bump'; skill: SkillId; by: number }
  | { kind: 'skill-choice'; from?: SkillId[]; by: number }
  | { kind: 'asset-delta'; by: number }
  | { kind: 'credit-delta'; by: number }
  | { kind: 'max-health-bump'; by: number }
  | { kind: 'max-edge-bump'; by: number }
  | { kind: 'cyber-immunity-bump'; by: number }
  | { kind: 'skill-points-bonus'; by: number }

export type BackgroundBonus =
  | LeafBonus
  | { kind: 'one-of'; options: LeafBonus[] }

/**
 * What the modal commits onto the picked background entry — always a leaf
 * with concrete values, never a `one-of` or `choose-*` wrapper.
 */
export type ResolvedBonus =
  | { kind: 'grant-talent'; talentId: string }
  | { kind: 'choose-talent'; talentId: string }
  | { kind: 'attribute-bump'; attribute: AttributeId; by: number }
  | { kind: 'attribute-choice'; attribute: AttributeId; by: number }
  | { kind: 'skill-bump'; skill: SkillId; by: number }
  | { kind: 'skill-choice'; skill: SkillId; by: number }
  | { kind: 'asset-delta'; by: number }
  | { kind: 'credit-delta'; by: number }
  | { kind: 'max-health-bump'; by: number }
  | { kind: 'max-edge-bump'; by: number }
  | { kind: 'cyber-immunity-bump'; by: number }
  | { kind: 'skill-points-bonus'; by: number }

export interface TalentChoice {
  talent: string
  careerName: string
  tier: number
}

/**
 * Enumerate the talents that satisfy a `choose-talent` spec. Talents above
 * `CREATION_TALENT_MAX_TIER` are excluded — character creation can't reach
 * them. Multiple careers contributing the same talent name show up once per
 * career so the player can see which tree it lives in (and the resulting
 * granted entry doesn't track career anyway, so dedupe-by-name is cosmetic).
 */
export function talentChoicesFor(
  spec: Extract<BackgroundBonus, { kind: 'choose-talent' }>,
  primaryCareerName: string | null,
  careers: CareerData[],
): TalentChoice[] {
  const wantCareers: string[] = []
  if (spec.from.careers) wantCareers.push(...spec.from.careers)
  if (spec.from.primaryCareer) {
    if (!primaryCareerName) return []
    wantCareers.push(primaryCareerName)
  }
  const tierLimit = Math.min(
    spec.from.tier ?? CREATION_TALENT_MAX_TIER,
    CREATION_TALENT_MAX_TIER,
  )
  const out: TalentChoice[] = []
  for (const career of careers) {
    if (wantCareers.length > 0 && !wantCareers.includes(career.name)) continue
    for (const t of career.talents) {
      if (spec.from.tier === undefined) {
        if (t.tier > tierLimit) continue
      } else if (t.tier !== spec.from.tier) {
        continue
      }
      out.push({ talent: t.talent, careerName: career.name, tier: t.tier })
    }
  }
  return out
}

export function skillChoicesFor(
  spec: Extract<BackgroundBonus, { kind: 'skill-choice' }>,
): SkillId[] {
  if (!spec.from || spec.from.length === 0) return SKILLS.map((s) => s.id)
  return spec.from
}

export function attributeChoicesFor(
  spec: Extract<BackgroundBonus, { kind: 'attribute-choice' }>,
): AttributeId[] {
  if (!spec.from || spec.from.length === 0)
    return ATTRIBUTE_DEFINITIONS.map((a) => a.id)
  return spec.from
}

export function bonusNeedsChoice(spec: BackgroundBonus): boolean {
  switch (spec.kind) {
    case 'choose-talent':
    case 'attribute-choice':
    case 'skill-choice':
    case 'one-of':
      return true
    default:
      return false
  }
}

/**
 * For a fixed (non-choice) leaf, return the resolved form directly. The
 * wizard calls this for every non-choice bonus when the player picks an
 * entry, so the modal only opens when an actual choice is needed.
 */
export function resolveFixed(spec: LeafBonus): ResolvedBonus | null {
  switch (spec.kind) {
    case 'grant-talent':
    case 'attribute-bump':
    case 'skill-bump':
    case 'asset-delta':
    case 'credit-delta':
    case 'max-health-bump':
    case 'max-edge-bump':
    case 'cyber-immunity-bump':
    case 'skill-points-bonus':
      return spec
    case 'choose-talent':
    case 'attribute-choice':
    case 'skill-choice':
      return null
  }
}

export interface BonusProjection {
  attributeDeltas: Partial<Record<AttributeId, number>>
  skillDeltas: Record<SkillId, number>
  grantedTalentNames: string[]
  assetDelta: number
  creditDelta: number
  derivedStatBonuses: {
    maxHealth: number
    maxEdge: number
    cyberImmunity: number
  }
  skillPointsBonus: number
}

export function emptyProjection(): BonusProjection {
  return {
    attributeDeltas: {},
    skillDeltas: {},
    grantedTalentNames: [],
    assetDelta: 0,
    creditDelta: 0,
    derivedStatBonuses: { maxHealth: 0, maxEdge: 0, cyberImmunity: 0 },
    skillPointsBonus: 0,
  }
}

/**
 * Aggregate a flat list of resolved bonuses into the shape the wizard
 * needs at submit time: per-attribute and per-skill deltas, granted
 * talent names, wallet deltas, derived-stat bumps and the skill-points
 * budget shift.
 */
export function projectResolvedBonuses(
  resolved: ResolvedBonus[],
): BonusProjection {
  const out = emptyProjection()
  for (const r of resolved) {
    switch (r.kind) {
      case 'attribute-bump':
      case 'attribute-choice':
        out.attributeDeltas[r.attribute] =
          (out.attributeDeltas[r.attribute] ?? 0) + r.by
        break
      case 'skill-bump':
      case 'skill-choice':
        out.skillDeltas[r.skill] = (out.skillDeltas[r.skill] ?? 0) + r.by
        break
      case 'grant-talent':
      case 'choose-talent':
        if (!out.grantedTalentNames.includes(r.talentId))
          out.grantedTalentNames.push(r.talentId)
        break
      case 'asset-delta':
        out.assetDelta += r.by
        break
      case 'credit-delta':
        out.creditDelta += r.by
        break
      case 'max-health-bump':
        out.derivedStatBonuses.maxHealth += r.by
        break
      case 'max-edge-bump':
        out.derivedStatBonuses.maxEdge += r.by
        break
      case 'cyber-immunity-bump':
        out.derivedStatBonuses.cyberImmunity += r.by
        break
      case 'skill-points-bonus':
        out.skillPointsBonus += r.by
        break
    }
  }
  return out
}
