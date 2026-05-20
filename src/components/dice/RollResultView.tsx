import { useState } from 'react'
import { Die } from './Die'
import type { DieType } from '~/lib/game-logic/dice'
import type { DiceRollData } from '~/lib/server/dice'
import { UNIVERSAL_TRIGGER_OPTIONS } from '~/data/trigger-options'

const SYMBOL_ORDER = [
  'botch',
  'success',
  'complication',
  'trigger',
  'xp',
  'wound',
  'minion',
  'cyberware',
  'adrenaline',
] as const

function orderSymbols(summary: Record<string, number>): string[] {
  return Object.keys(summary).sort((a, b) => {
    const ia = SYMBOL_ORDER.indexOf(a as (typeof SYMBOL_ORDER)[number])
    const ib = SYMBOL_ORDER.indexOf(b as (typeof SYMBOL_ORDER)[number])
    return (
      (ia === -1 ? SYMBOL_ORDER.length : ia) -
      (ib === -1 ? SYMBOL_ORDER.length : ib)
    )
  })
}

const TYPE_ORDER: DieType[] = ['standard', 'aptitude', 'expertise', 'injury']

// Tunes how quickly result dice cascade in. Total animation ≈ stagger * dice + 420ms.
const CASCADE_STAGGER_MS = 60

interface RollResultViewProps {
  data: DiceRollData
  dieSize?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

export function RollResultView({
  data,
  dieSize = 'sm',
  animate = true,
}: RollResultViewProps) {
  const summary = data.summary ?? {}
  const ordered = orderSymbols(summary)
  const dice = [...(data.result ?? [])].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type),
  )
  const triggerCount = summary.trigger ?? 0

  return (
    <div>
      <div className="mb-5">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
          Result
        </p>
        {ordered.length === 0 ? (
          <p className="text-sm text-gray-700">No symbols</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {ordered.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-sm text-gray-1000"
              >
                <img
                  src={`/img/symbols/${s}.png`}
                  alt={s}
                  width={20}
                  height={20}
                />
                <span className="capitalize">{s}</span>
                <span className="text-gray-900">×{summary[s]}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {dice.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
            Rolled Dice
          </p>
          <div className="flex flex-wrap gap-2">
            {dice.map((d, i) => (
              <div
                key={i}
                className={animate ? 'die-tumble-in' : undefined}
                style={
                  animate
                    ? { animationDelay: `${i * CASCADE_STAGGER_MS}ms` }
                    : undefined
                }
              >
                <Die
                  type={d.type}
                  symbols={d.symbols}
                  exploded={d.exploded}
                  size={dieSize}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {triggerCount > 0 && <TriggerOptionsPanel triggerCount={triggerCount} />}
    </div>
  )
}

/**
 * Collapsible "what can I do with these triggers?" panel — shown only on
 * rolls that produced trigger symbols. Lists the rulebook's universal
 * trigger options plus the always-on 2-for-1 success conversion.
 * Context-specific options (combat, weapon-specific) aren't included yet.
 */
function TriggerOptionsPanel({ triggerCount }: { triggerCount: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-gray-400 bg-background-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-gray-1000 transition hover:bg-gray-100"
        aria-expanded={open}
      >
        <span>
          What can I do with{' '}
          <span className="font-semibold">{triggerCount}</span>{' '}
          {triggerCount === 1 ? 'trigger' : 'triggers'}?
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-gray-700 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>
      {open && (
        <ul className="divide-y divide-gray-400 border-t border-gray-400">
          {UNIVERSAL_TRIGGER_OPTIONS.map((opt) => {
            const baseCost = parseInt(opt.cost, 10)
            const affordable = !isNaN(baseCost) && triggerCount >= baseCost
            return (
              <li
                key={opt.name}
                className={`flex gap-2 px-3 py-2 text-xs ${affordable ? 'text-gray-1000' : 'text-gray-700'}`}
              >
                <span
                  className={`inline-flex h-5 min-w-[1.5rem] shrink-0 items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums ${
                    affordable
                      ? 'bg-accent-300 text-accent-1000'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                  title={`${opt.cost} trigger${opt.cost.startsWith('1') && !opt.cost.includes('+') ? '' : 's'}`}
                >
                  {opt.cost}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{opt.name}</p>
                  <p className="mt-0.5 leading-snug">{opt.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
