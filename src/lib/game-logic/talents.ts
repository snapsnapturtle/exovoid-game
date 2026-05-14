import type { Character, TalentEntry } from '~/lib/types/database'

export interface CareerTalentRef {
  talent: string
  tier: number
}

export interface CareerData {
  name: string
  description?: string
  startingSkills?: { name: string; level: number }[]
  startingEquipment?: string[]
  talents: CareerTalentRef[]
}

export function careersOfCharacter(character: Character): string[] {
  return character.career ? [character.career] : []
}

export function unlockedInCareer(
  talents: TalentEntry[],
  careerName: string,
): TalentEntry[] {
  return talents.filter((t) => t.career === careerName)
}

export function pointsTotal(level: number): number {
  return 2 + Math.max(0, level - 1)
}

export function pointsSpent(talents: TalentEntry[]): number {
  const names = new Set(talents.filter((t) => !t.granted).map((t) => t.name))
  return names.size
}

export function pointsAvailable(character: Character): number {
  return pointsTotal(character.level) - pointsSpent(character.talents)
}

/**
 * Loosest tier prereq: tier N is unlocked once there are >= N talents
 * already in that career (any tier). Matches the rulebook's "total sum
 * of talents you have already unlocked".
 */
export function tierPrereqMet(
  unlockedCountInCareer: number,
  tier: number,
): boolean {
  return tier <= unlockedCountInCareer
}

/**
 * Check if any tier-N pick depends on enough lower-tier siblings to stay
 * legal. Used both by the wizard (set-validity check) and by canRemove.
 */
export function isLegalTalentSet(
  picks: { talent: string; tier: number }[],
): boolean {
  for (const t of picks) {
    const lowerCount = picks.filter((o) => o.talent !== t.talent && o.tier < t.tier).length
    if (!tierPrereqMet(lowerCount, t.tier)) return false
  }
  return true
}

export function sharedAcrossCareers(
  talentName: string,
  careers: CareerData[],
): string[] {
  return careers
    .filter((c) => c.talents.some((t) => t.talent === talentName))
    .map((c) => c.name)
}

export interface CanResult {
  ok: boolean
  reason?: string
}

export function canUnlock(
  character: Character,
  careerName: string,
  talentName: string,
  careers: CareerData[],
): CanResult {
  if (character.talents.some((t) => t.name === talentName)) {
    return { ok: false, reason: 'Already unlocked.' }
  }
  if (pointsAvailable(character) <= 0) {
    return { ok: false, reason: 'No talent points available.' }
  }
  const career = careers.find((c) => c.name === careerName)
  if (!career) {
    return { ok: false, reason: `Career "${careerName}" not found.` }
  }
  const ref = career.talents.find((t) => t.talent === talentName)
  if (!ref) {
    return {
      ok: false,
      reason: `${talentName} is not in the ${careerName} talent tree.`,
    }
  }
  const unlockedCount = unlockedInCareer(character.talents, careerName).length
  if (!tierPrereqMet(unlockedCount, ref.tier)) {
    return {
      ok: false,
      reason: `Tier ${ref.tier} requires ${ref.tier} talents in this career (have ${unlockedCount}).`,
    }
  }
  return { ok: true }
}

export function canRemove(
  character: Character,
  talentName: string,
): CanResult {
  if (!character.talents.some((t) => t.name === talentName)) {
    return { ok: false, reason: 'Not unlocked.' }
  }
  const remaining = character.talents.filter((t) => t.name !== talentName)
  // Granted talents stand alone — they don't participate in tier prereqs.
  const careerEntries = remaining.filter((t) => !t.granted)
  const careers = new Set(careerEntries.map((t) => t.career))
  for (const career of careers) {
    const inCareer = careerEntries.filter((t) => t.career === career)
    const picks = inCareer.map((t) => ({ talent: t.name, tier: t.tier }))
    if (!isLegalTalentSet(picks)) {
      return {
        ok: false,
        reason: 'Removing this would leave a higher-tier talent without its prerequisite.',
      }
    }
  }
  return { ok: true }
}

export function makeTalentEntry(
  name: string,
  career: string,
  tier: number,
  acquiredAt: number,
): TalentEntry {
  return { name, career, tier, acquiredAt }
}
