import { useMemo, useState } from 'react'
import {
  groupedMalfunctions,
  SEVERITY_LABEL,
  type MalfunctionGroup,
  type SeverityRange,
} from '~/lib/game-logic/cyberware-malfunctions'
import { Badge, type BadgeTone } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'

interface MalfunctionTableModalProps {
  excess: number
  allocations: number[]
  busy: boolean
  onSave: (allocations: number[]) => void
  onClose: () => void
}

const SEVERITY_TONE: Record<SeverityRange, BadgeTone> = {
  central: 'accent',
  outer: 'warning',
  extreme: 'danger',
}

export function MalfunctionTableModal({
  excess,
  allocations,
  busy,
  onSave,
  onClose,
}: MalfunctionTableModalProps) {
  const groups = useMemo(() => groupedMalfunctions(), [])
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(allocations),
  )

  const total = selected.size
  const remaining = excess - total
  const canSave = total === excess && !busy

  function toggle(slot: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slot)) {
        next.delete(slot)
      } else {
        if (next.size >= excess) return prev
        next.add(slot)
      }
      return next
    })
  }

  function handleSave() {
    onSave([...selected].sort((a, b) => a - b))
  }

  return (
    <Modal
      onClose={onClose}
      title="Cyber Malfunction Table"
      subtitle={`Pick ${excess} ${excess === 1 ? 'slot' : 'slots'} across the table. Slots near the center (15–25) trigger mild malfunctions but are more likely to be rolled; slots at the extremes (2–9, 31–40) are severe but rarely hit. Each slot can only be picked once.`}
      size="md"
      stickyHeader={
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-900">
            Selected{' '}
            <span
              className={
                total === excess
                  ? 'font-medium text-accent-900'
                  : 'font-medium text-warning-900'
              }
            >
              {total}
            </span>{' '}
            / {excess}
            {remaining > 0 && (
              <span className="ml-2 text-xs text-warning-900">
                {remaining} remaining
              </span>
            )}
          </span>
        </div>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {busy ? 'Saving…' : 'Save allocations'}
          </Button>
        </>
      }
    >
      <ul className="space-y-3">
        {groups.map((g) => (
          <OutcomeGroup
            key={g.outcome}
            group={g}
            selected={selected}
            canSelectMore={remaining > 0}
            onToggle={toggle}
          />
        ))}
      </ul>
    </Modal>
  )
}

function formatRange(rolls: number[]): string {
  if (rolls.length === 1) return String(rolls[0])
  return `${rolls[0]}–${rolls[rolls.length - 1]}`
}

function OutcomeGroup({
  group,
  selected,
  canSelectMore,
  onToggle,
}: {
  group: MalfunctionGroup
  selected: Set<number>
  canSelectMore: boolean
  onToggle: (slot: number) => void
}) {
  return (
    <li className="rounded-lg border border-gray-400 bg-background-100/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-white">{group.outcome}</span>
        <Badge tone={SEVERITY_TONE[group.severity]} uppercase>
          {SEVERITY_LABEL[group.severity]}
        </Badge>
        <Badge tone="neutral" className="font-mono">
          {formatRange(group.rolls)}
        </Badge>
      </div>
      <p className="text-xs text-gray-900">{group.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {group.rolls.map((roll) => {
          const isSelected = selected.has(roll)
          const disabled = !isSelected && !canSelectMore
          return (
            <button
              key={roll}
              onClick={() => onToggle(roll)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`h-9 min-w-[2.5rem] rounded-md border px-2 text-sm font-semibold transition-colors ${
                isSelected
                  ? 'border-accent-600 bg-accent-300 text-white'
                  : disabled
                    ? 'border-gray-400 bg-background-200/60 text-gray-700'
                    : 'border-gray-400 bg-gray-100/60 text-gray-1000 hover:border-accent-500 hover:bg-accent-200'
              }`}
            >
              {roll}
            </button>
          )
        })}
      </div>
    </li>
  )
}
