import type { CombatParticipant } from '~/lib/types/domain'

/**
 * Sort combat participants: highest current AP first, then higher
 * Coolness, then "players act first" (tracked implicitly since we only
 * have PCs in v1 — no NPCs yet). Ties between two PCs of equal AP and
 * Coolness are left for the players to decide at the table.
 */
export function sortByTurnOrder(
  participants: readonly CombatParticipant[],
): CombatParticipant[] {
  return [...participants].sort((a, b) => {
    if (a.ap !== b.ap) return b.ap - a.ap
    if (a.coolness !== b.coolness) return b.coolness - a.coolness
    return 0
  })
}

/**
 * Group participants by their current AP into rows for the horizontal
 * timeline. Cells appear in descending AP order (highest first = the
 * "NOW" slot on the right of the bar at render time). Within a slot
 * tiebreaks order them (Coolness desc).
 */
export interface TimelineSlot {
  ap: number
  participants: CombatParticipant[]
}

export function groupByAp(
  participants: readonly CombatParticipant[],
): TimelineSlot[] {
  const sorted = sortByTurnOrder(participants)
  const slots: TimelineSlot[] = []
  for (const p of sorted) {
    const last = slots[slots.length - 1]
    if (last && last.ap === p.ap) {
      last.participants.push(p)
    } else {
      slots.push({ ap: p.ap, participants: [p] })
    }
  }
  return slots
}

/**
 * Roll 1d6 — used at the top of each combat round for initiative.
 * Cryptographically unimportant; just needs to feel fair.
 */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1
}

export function isCurrentActor(
  participant: CombatParticipant,
  all: readonly CombatParticipant[],
): boolean {
  const top = sortByTurnOrder(all)[0]
  return !!top && top.characterId === participant.characterId
}
