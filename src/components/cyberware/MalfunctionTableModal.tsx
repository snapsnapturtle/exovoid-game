import { useMemo, useState } from 'react'
import {
  groupedMalfunctions,
  SEVERITY_LABEL,
  type MalfunctionGroup,
  type SeverityRange,
} from '~/lib/game-logic/cyberware-malfunctions'

interface MalfunctionTableModalProps {
  excess: number
  allocations: number[]
  busy: boolean
  onSave: (allocations: number[]) => void
  onClose: () => void
}

const SEVERITY_STYLES: Record<SeverityRange, string> = {
  central: 'border-cyber-500/40 bg-cyber-500/10 text-cyber-300',
  outer: 'border-warning-500/40 bg-warning-500/10 text-warning-400',
  extreme: 'border-danger-500/50 bg-danger-500/10 text-danger-400',
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-void-600 bg-void-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-void-700 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Cyber Malfunction Table
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Pick {excess} {excess === 1 ? 'slot' : 'slots'} across the table.
              Slots near the center (15–25) trigger mild malfunctions but are
              more likely to be rolled; slots at the extremes (2–9, 31–40) are
              severe but rarely hit. Each slot can only be picked once.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex items-center justify-between border-b border-void-700 bg-void-900/50 px-5 py-3 text-sm">
          <span className="text-gray-400">
            Selected{' '}
            <span
              className={
                total === excess
                  ? 'font-medium text-cyber-300'
                  : 'font-medium text-warning-400'
              }
            >
              {total}
            </span>{' '}
            / {excess}
            {remaining > 0 && (
              <span className="ml-2 text-xs text-warning-400">
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

        <footer className="flex items-center justify-end gap-2 border-t border-void-700 px-5 py-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-void-600 bg-void-700 px-3 py-1.5 text-sm text-gray-300 transition hover:border-void-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg border border-accent-500/60 bg-accent-500/15 px-3 py-1.5 text-sm font-medium text-accent-200 transition hover:bg-accent-500/25 disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save allocations'}
          </button>
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
    <li className="rounded-lg border border-void-700 bg-void-900/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-white">{group.outcome}</span>
        <span
          className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sevClass}`}
        >
          {SEVERITY_LABEL[group.severity]}
        </span>
        <span className="rounded-md border border-void-600 bg-void-700 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
          {formatRange(group.rolls)}
        </span>
      </div>
      <p className="text-xs text-gray-400">{group.description}</p>
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
                  ? 'border-accent-500 bg-accent-500/25 text-white shadow-sm shadow-accent-500/20'
                  : disabled
                    ? 'border-void-700 bg-void-800/60 text-gray-600'
                    : 'border-void-600 bg-void-700/60 text-gray-300 hover:border-accent-500/60 hover:bg-accent-500/10 hover:text-white'
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
