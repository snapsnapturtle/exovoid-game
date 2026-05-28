import downtimeActivitiesData from '~/data/downtime-activities.json'
import { SKILLS } from './skills'

export interface DowntimeCheck {
  skillId: string
  difficulty: number
}

export interface DowntimeActivity {
  id: string
  name: string
  description: string
  oncePerLevel: boolean
  check?: DowntimeCheck
}

export const DOWNTIME_ACTIVITIES: DowntimeActivity[] =
  downtimeActivitiesData as DowntimeActivity[]

export function isActivityAvailable(
  activity: DowntimeActivity,
  character: { level: number; downtime_uses_used: Record<string, number> },
): boolean {
  if (!activity.oncePerLevel) return true
  const lastUsedAt = character.downtime_uses_used[activity.id] ?? 0
  return lastUsedAt < character.level
}

export function relaxAndRestHealAmount(maxHealth: number): number {
  return Math.ceil(maxHealth * 0.2)
}

export function seekInspirationEdgeCap(maxEdge: number): number {
  return Math.ceil(maxEdge * 1.5)
}

// Skill is trainable when current level <= 3 (rulebook: "+1 skill level, but
// only in a skill they have 3 or less levels in"). Iterates the full SKILLS
// catalog so skills missing from the persisted JSONB blob (which default to
// level 0 everywhere else in the app) still show up — they are exactly the
// most-eligible candidates.
export function trainableSkillIds(skills: Record<string, number>): string[] {
  return SKILLS.filter((s) => (skills[s.id] ?? 0) <= 3).map((s) => s.id)
}
