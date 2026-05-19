import { useMemo, useState } from 'react'
import {
  groupedMalfunctions,
  SEVERITY_LABEL,
  type MalfunctionGroup,
  type SeverityRange,
} from '~/lib/game-logic/cyberware-malfunctions'
import { Button } from '~/components/ui/Button'

interface MalfunctionTableModalProps {
  excess: number
  allocations: number[]
  busy: boolean
  onSave: (allocations: number[]) => void
  onClose: () => void
}

const SEVERITY_STYLES: Record<SeverityRange, string> = {
  central: 'border-accent-700/40 bg-accent-700/10 text-accent-900',
  outer: 'border-warning-700/40 bg-warning-700/10 text-warning-900',
  extreme: 'border-danger-700/50 bg-danger-700/10 text-danger-900',
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
    <div
      className="modal-backdrop-in fixed backdrop-blur-sm inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col modal-card-in rounded-xl border border-gray-400 bg-background-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-400 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Cyber Malfunction Table
            </h3>
            <p className="mt-1 text-xs text-gray-900">
              Pick {excess} {excess === 1 ? 'slot' : 'slots'} across the table.
              Slots near the center (15–25) trigger mild malfunctions but are
              more likely to be rolled; slots at the extremes (2–9, 31–40) are
              severe but rarely hit. Each slot can only be picked once.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-900 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex items-center justify-between border-b border-gray-400 bg-background-100/50 px-5 py-3 text-sm">
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

        <div className="flex-1 overflow-y-auto px-5 py-3">
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
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-400 px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {busy ? 'Saving…' : 'Save allocations'}
          </Button>
        </footer>
      </div>
    </div>
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
  const sevClass = SEVERITY_STYLES[group.severity]
  return (
    <li className="rounded-lg border border-gray-400 bg-background-100/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-white">{group.outcome}</span>
        <span
          className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sevClass}`}
        >
          {SEVERITY_LABEL[group.severity]}
        </span>
        <span className="rounded-md border border-gray-400 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-900">
          {formatRange(group.rolls)}
        </span>
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
              className={`h-9 min-w-[2.5rem] rounded-md border px-2 text-sm font-semibold transition ${
                isSelected
                  ? 'border-accent-700 bg-accent-700/25 text-white shadow-sm shadow-accent-700/20'
                  : disabled
                    ? 'border-gray-400 bg-background-200/60 text-gray-700'
                    : 'border-gray-400 bg-gray-100/60 text-gray-1000 hover:border-accent-700/60 hover:bg-accent-700/10 hover:text-white'
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
