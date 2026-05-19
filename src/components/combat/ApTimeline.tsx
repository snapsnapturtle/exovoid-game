import { useMemo } from 'react'
import type { CombatParticipant } from '~/lib/types/database'
import { groupByAp } from '~/lib/game-logic/combat'

interface ApTimelineProps {
  participants: CombatParticipant[]
}

const MIN_CELLS = 6
const MAX_CELLS = 16

/**
 * Horizontal AP timeline. Leftmost cell ("NOW") is the participant(s)
 * with the highest current AP — they act next. Cells to the right mark
 * how many AP each other participant is behind, reading left-to-right
 * along the natural reading direction. Same-AP participants stack
 * vertically inside a single cell. Negative AP slots are visually distinct.
 */
export function ApTimeline({ participants }: ApTimelineProps) {
  const cells = useMemo(() => buildCells(participants), [participants])

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
              className={`flex min-w-[5.5rem] flex-1 flex-col border-t-2 px-1.5 py-2 ${
                isNow
                  ? 'border-accent-700'
                  : isNegative
                    ? 'border-danger-700/40'
                    : 'border-gray-400'
              }`}
            >
              <div className="flex flex-1 flex-col items-stretch gap-1">
                {cell.participants.map((p) => (
                  <div
                    key={p.characterId}
                    className={`rounded-md border px-1.5 py-1 text-center text-[11px] font-medium ${
                      isNow
                        ? 'border-accent-700 bg-accent-700/25 text-white'
                        : isNegative
                          ? 'border-danger-700/40 bg-danger-700/10 text-danger-900'
                          : 'border-accent-700/40 bg-accent-700/10 text-accent-900'
                    }`}
                    title={`${p.name} · ${p.ap} AP (started ${p.baseAp + p.rolled})`}
                  >
                    <div className="truncate">{p.name}</div>
                    <div className="text-[10px] opacity-80">
                      {p.ap} AP
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={`mt-2 text-center text-[10px] ${
                  isNow ? 'text-accent-900' : 'text-gray-700'
                }`}
              >
                {isNow ? 'NOW' : cell.label}
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
  label: string
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
      label: ap === top ? 'NOW' : `${top - ap} back`,
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
