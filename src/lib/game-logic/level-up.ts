import type {
  Character,
  ProgressionEntry,
  TalentEntry,
} from '~/lib/types/domain'
import { MAX_SKILL_LEVEL } from './skills'
import {
  pointsTotal as talentPointsTotal,
  tierPrereqMet,
  unlockedInCareer,
  type CareerData,
} from './talents'

export const SKILL_POINTS_PER_LEVEL = 2

/**
 * Rulebook: "getting a level above 4 (so the levels 5, 6, 7 and 8) cost 2
 * skill points each to increase." `targetLevel` is the level the skill is
 * being raised TO. Going 4 → 5 is the first cost-2 transition.
 */
export function skillPointCost(targetLevel: number): number {
  return targetLevel >= 5 ? 2 : 1
}

/**
 * Total skill-point cost of raising a skill from `from` to `to` (inclusive
 * of every transition in between).
 */
export function skillBumpCost(from: number, to: number): number {
  let total = 0
  for (let lvl = from + 1; lvl <= to; lvl++) total += skillPointCost(lvl)
  return total
}

/**
 * The shape we commit into `picks` on a `source: 'level-up'` row.
 * - `skills`: skillId → number of levels added at this level (positive
 *   integers; the resulting cost depends on the target levels of each
 *   step and is bounded by SKILL_POINTS_PER_LEVEL).
 * - `talent`: the talent unlocked at this level, or `null` when the
 *   point banks (no legal choice or player chose to defer).
 */
export type LevelUpPicks = {
  skills: Record<string, number>
  talent: { name: string; career: string; tier: number } | null
}

export function isLevelUpPicks(value: unknown): value is LevelUpPicks {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (!('skills' in v) || typeof v.skills !== 'object') return false
  if (!('talent' in v)) return false
  return true
}

/**
 * Find the lowest level in [2..character.level] that has no committed
 * level-up row yet. Returns null when every level is accounted for.
 */
export function pendingLevelUp(
  character: Character,
  progression: ProgressionEntry[],
): { level: number } | null {
  const committed = new Set(
    progression.filter((p) => p.source === 'level-up').map((p) => p.level),
  )
  for (let lvl = 2; lvl <= character.level; lvl++) {
    if (!committed.has(lvl)) return { level: lvl }
  }
  return null
}

/**
 * Total skill points spent in a draft. Each entry is the *number of
 * levels added* to a skill; cost depends on the target levels traversed.
 */
export function skillPointsSpentInDraft(
  baseSkills: Record<string, number>,
  draftDeltas: Record<string, number>,
): number {
  let total = 0
  for (const [skillId, delta] of Object.entries(draftDeltas)) {
    if (delta <= 0) continue
    const from = baseSkills[skillId] ?? 0
    total += skillBumpCost(from, from + delta)
  }
  return total
}

export function skillPointsRemaining(
  baseSkills: Record<string, number>,
  draftDeltas: Record<string, number>,
): number {
  return (
    SKILL_POINTS_PER_LEVEL - skillPointsSpentInDraft(baseSkills, draftDeltas)
  )
}

/**
 * Whether one more bump on `skillId` is affordable AND still under the
 * skill cap. Used by the +/- UI to disable buttons.
 */
export function canBumpSkill(
  baseSkills: Record<string, number>,
  draftDeltas: Record<string, number>,
  skillId: string,
): boolean {
  const from = baseSkills[skillId] ?? 0
  const delta = draftDeltas[skillId] ?? 0
  const targetLevel = from + delta + 1
  if (targetLevel > MAX_SKILL_LEVEL) return false
  const remaining = skillPointsRemaining(baseSkills, draftDeltas)
  return remaining >= skillPointCost(targetLevel)
}

export function canUnbumpSkill(
  draftDeltas: Record<string, number>,
  skillId: string,
): boolean {
  return (draftDeltas[skillId] ?? 0) > 0
}

export interface LegalTalentChoice {
  name: string
  description: string
  career: string
  tier: number
}

/**
 * Enumerate talents the character can legally unlock during the
 * level-up at `levelAtUnlock`. "Legal" means: in one of the character's
 * career trees, tier prereq met (count of talents already on the
 * character in that career ≥ tier), and not already owned.
 *
 * `talentDescriptions` is a `name → description` lookup sourced from
 * `talents.json`. Sorted by tier asc, then by name.
 */
export function legalTalentsForLevelUp(
  character: Character,
  careers: CareerData[],
  talentDescriptions: Map<string, string>,
): LegalTalentChoice[] {
  const ownedNames = new Set(character.talents.map((t) => t.name))
  const out: LegalTalentChoice[] = []
  for (const career of careers) {
    const unlockedCount = unlockedInCareer(
      character.talents,
      career.name,
    ).length
    for (const ref of career.talents) {
      if (ownedNames.has(ref.talent)) continue
      if (!tierPrereqMet(unlockedCount, ref.tier)) continue
      out.push({
        name: ref.talent,
        description: talentDescriptions.get(ref.talent) ?? '',
        career: career.name,
        tier: ref.tier,
      })
    }
  }
  out.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
  return out
}

/**
 * Apply a committed level-up to a character. Returns the new
 * `skills` and `talents` snapshots; callers wire them through
 * `useCharacter`'s update path. Pure — does not mutate inputs.
 */
export function applyLevelUp(
  character: Character,
  level: number,
  picks: LevelUpPicks,
): { skills: Record<string, number>; talents: TalentEntry[] } {
  const skills = { ...character.skills }
  for (const [skillId, delta] of Object.entries(picks.skills)) {
    skills[skillId] = (skills[skillId] ?? 0) + delta
  }
  const talents = [...character.talents]
  if (picks.talent) {
    talents.push({
      name: picks.talent.name,
      career: picks.talent.career,
      tier: picks.talent.tier,
      acquiredAt: level,
    })
  }
  return { skills, talents }
}

// Re-export with the level-up domain name so call sites read clearly.
export const talentPointsTotalAtLevel = talentPointsTotal
