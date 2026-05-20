import { useMemo } from 'react'
import type { CombatParticipant } from '~/lib/types/database'
import { groupByAp, sortByTurnOrder } from '~/lib/game-logic/combat'

interface ApTimelineProps {
  participants: CombatParticipant[]
  characterNames: Map<string, string>
}

const MIN_CELLS = 10
const MAX_CELLS = 18

/**
 * Horizontal AP timeline. Leftmost cell ("NOW") is the participant(s)
 * with the highest current AP — they act next. Cells to the right mark
 * how many AP each other participant is behind, reading left-to-right
 * along the natural reading direction. Same-AP participants stack
 * vertically inside a single cell. Negative AP slots are visually distinct.
 */
export function ApTimeline({ participants, characterNames }: ApTimelineProps) {
  const cells = useMemo(() => buildCells(participants), [participants])
  const currentActorId = useMemo(
    () => sortByTurnOrder(participants)[0]?.characterId ?? null,
    [participants],
  )

  if (participants.length === 0 || cells.length === 0) return null

  return (
    <section className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-900">
          Initiative
        </h2>
        <span className="text-[10px] text-gray-700">
          leftmost = up next · stacked = same AP
        </span>
      </div>
      <div className="flex w-full items-stretch gap-1 overflow-x-auto">
        {cells.map((cell, idx) => {
          const isNow = idx === 0 && cell.participants.length > 0
          const isNegative = cell.ap < 0
          return (
            <div
              key={idx}
              className={`flex w-28 shrink-0 flex-col border-t-2 bg-linear-to-b to-transparent px-1.5 py-2 ${
                isNow
                  ? 'border-accent-700 from-accent-700/20'
                  : isNegative
                    ? 'border-danger-700/40 from-danger-700/15'
                    : 'border-gray-400 from-gray-100'
              }`}
            >
              <div className="flex flex-1 flex-col items-stretch gap-1">
                {cell.participants.map((p) => {
                  const active = p.characterId === currentActorId
                  const name = characterNames.get(p.characterId) ?? p.name
                  return (
                    <div
                      key={p.characterId}
                      className={`flex min-h-10 items-center justify-center rounded-md border px-1.5 py-1 text-center text-[11px] font-medium ${
                        active
                          ? 'border-accent-700 bg-accent-700/25 text-white'
                          : isNegative
                            ? 'border-danger-700/40 bg-danger-700/10 text-danger-900'
                            : 'border-gray-400 bg-gray-100 text-gray-900'
                      }`}
                      title={`${name} · ${p.ap} AP (started ${p.baseAp + p.rolled})`}
                    >
                      <span className="line-clamp-2 break-words leading-tight">
                        {name}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div
                className={`mt-2 text-center text-[10px] ${
                  isNow ? 'text-accent-900' : 'text-gray-700'
                }`}
              >
                {isNow ? 'NOW' : `${cell.ap} AP`}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

interface Cell {
  ap: number
  participants: CombatParticipant[]
}

function buildCells(participants: CombatParticipant[]): Cell[] {
  if (participants.length === 0) return []

  const slots = groupByAp(participants)
  const maxAp = slots[0].ap
  const minAp = slots[slots.length - 1].ap

  // Bar spans the full range, with each cell representing one AP step.
  // Render left-to-right from lowest to highest AP so "NOW" sits on the right.
  let bottom = minAp
  const top = maxAp
  // Pad to a minimum width so a tight cluster still reads as a tracker.
  // Padding goes to the left (lower AP) since "NOW" is anchored on the right.
  if (top - bottom + 1 < MIN_CELLS) {
    bottom = top - (MIN_CELLS - 1)
  }
  // Cap the visible span to keep the bar from becoming gigantic. Anything
  // further behind NOW than MAX_CELLS - 1 clamps onto the leftmost cell.
  if (top - bottom + 1 > MAX_CELLS) {
    bottom = top - (MAX_CELLS - 1)
  }

  const byAp = new Map(slots.map((s) => [s.ap, s.participants]))
  const cells: Cell[] = []
  // NOW (highest AP) on the left → walk from top down to bottom.
  for (let ap = top; ap >= bottom; ap--) {
    cells.push({
      ap,
      participants: byAp.get(ap) ?? [],
    })
  }

  // If we clamped, collapse anyone further behind into the rightmost cell
  // (the "way behind" end).
  if (minAp < bottom) {
    const overflow: CombatParticipant[] = []
    for (const slot of slots) {
      if (slot.ap < bottom) overflow.push(...slot.participants)
    }
    if (overflow.length > 0) {
      const last = cells.length - 1
      cells[last] = {
        ...cells[last],
        participants: [...cells[last].participants, ...overflow],
      }
    }
  }

  return cells
}
