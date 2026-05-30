import { useState } from 'react'
import { Die } from './Die'
import type { DieType } from '~/lib/game-logic/dice'
import type { DiceRollData } from '~/lib/server/dice'
import {
  UNIVERSAL_TRIGGER_OPTIONS,
  type TriggerOption,
} from '~/data/trigger-options'
import { COMBAT_TRIGGER_OPTIONS } from '~/data/combat-triggers'
import { parseQuality } from '~/lib/game-logic/weapons'
import { lookupQuality } from '~/lib/game-logic/item-qualities'
import { Alert } from '~/components/ui/Alert'
import { Button } from '~/components/ui/Button'
import { IconChevronDown } from '@tabler/icons-react'
import type { PendingBonus } from '~/lib/types/database'

export type ApplyBonusInput = NonNullable<TriggerOption['bonus']>

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

const ABSORBED_SYMBOL_ORDER = [
  'success',
  'trigger',
  'complication',
  'botch',
  'xp',
] as const

function formatAbsorbedSummary(summary: Record<string, number>): string {
  const parts: string[] = []
  for (const s of ABSORBED_SYMBOL_ORDER) {
    const n = summary[s] ?? 0
    if (n > 0) parts.push(`+${n} ${s}`)
  }
  for (const [s, n] of Object.entries(summary)) {
    if (n > 0 && !ABSORBED_SYMBOL_ORDER.includes(s as never))
      parts.push(`+${n} ${s}`)
  }
  return parts.length === 0 ? 'nothing' : parts.join(', ')
}

interface RollResultViewProps {
  data: DiceRollData
  dieSize?: 'sm' | 'md' | 'lg'
  animate?: boolean
  /** Weapon-specific trigger option names (e.g. "Critical Hit", "Concealed (1)"). Resolved via lookupQuality. */
  weaponTriggers?: string[]
  /** If true, show the rulebook "Combat Triggers" section alongside the universal one. */
  showCombatTriggers?: boolean
  /**
   * Persist a bonus on the character (used by trigger options with a `bonus`
   * descriptor, e.g. Flow). Returns the new bonus's id so the panel can
   * un-apply it if the player toggles off. When undefined, Apply buttons
   * aren't shown.
   */
  onApplyBonus?: (bonus: ApplyBonusInput) => string
  /** Remove a previously-applied bonus (un-toggle). Wired alongside onApplyBonus. */
  onRemoveBonus?: (id: string) => void
  /** Live pending bonuses on the character — used to gate non-stackable Apply buttons (e.g. Flow). */
  currentBonuses?: PendingBonus[]
}

export function RollResultView({
  data,
  dieSize = 'sm',
  animate = true,
  weaponTriggers,
  showCombatTriggers = false,
  onApplyBonus,
  onRemoveBonus,
  currentBonuses,
}: RollResultViewProps) {
  const summary = data.summary ?? {}
  const ordered = orderSymbols(summary)
  const dice = [...(data.result ?? [])].sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type),
  )
  const absorbedSupports = data.absorbedSupports ?? []
  const triggerCount = summary.trigger ?? 0

  const isSupport = data.kind === 'support'

  return (
    <div>
      {absorbedSupports.length > 0 && (
        <div className="mb-4 rounded border border-accent-700/40 bg-accent-700/15 px-2.5 py-2 text-xs text-gray-1000">
          <p className="mb-1 font-medium text-accent-900">Including support</p>
          <ul className="space-y-0.5">
            {absorbedSupports.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.supporterName}</span>{' '}
                <span className="text-gray-700">
                  ({s.skillName}): {formatAbsorbedSummary(s.summary)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-5">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
          Result
        </p>
        {ordered.length === 0 ? (
          <p className="text-sm italic text-gray-700">Nothing</p>
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
      {!isSupport && triggerCount > 0 && (
        <div className="space-y-2">
          {weaponTriggers && weaponTriggers.length > 0 && (
            <WeaponTriggerPanel names={weaponTriggers} defaultOpen />
          )}
          {showCombatTriggers && (
            <TriggerOptionsPanel
              label="Combat triggers"
              triggerCount={triggerCount}
              options={COMBAT_TRIGGER_OPTIONS}
              onApplyBonus={onApplyBonus}
              onRemoveBonus={onRemoveBonus}
              currentBonuses={currentBonuses}
            />
          )}
          <TriggerOptionsPanel
            label="Universal triggers"
            triggerCount={triggerCount}
            options={UNIVERSAL_TRIGGER_OPTIONS}
            onApplyBonus={onApplyBonus}
            onRemoveBonus={onRemoveBonus}
            currentBonuses={currentBonuses}
          />
        </div>
      )}
      {isSupport && (
        <Alert variant="neutral" className="mt-4">
          Support contribution — these symbols will be added to the main
          roller's check when they absorb this support.
        </Alert>
      )}
    </div>
  )
}

/**
 * Collapsible panel listing a set of trigger options (universal or combat).
 * Affordable options stand out by row colour and pill tint.
 */
function TriggerOptionsPanel({
  label,
  triggerCount,
  options,
  defaultOpen = false,
  onApplyBonus,
  onRemoveBonus,
  currentBonuses,
}: {
  label: string
  triggerCount: number
  options: TriggerOption[]
  defaultOpen?: boolean
  onApplyBonus?: (bonus: ApplyBonusInput) => string
  onRemoveBonus?: (id: string) => void
  currentBonuses?: PendingBonus[]
}) {
  const [open, setOpen] = useState(defaultOpen)
  // Tracks the persisted bonus id per option name so the Apply button can
  // toggle between applying and un-applying within the same modal session.
  const [appliedIds, setAppliedIds] = useState<Map<string, string>>(
    () => new Map(),
  )

  function handleToggle(opt: TriggerOption) {
    if (!opt.bonus) return
    const existingId = appliedIds.get(opt.name)
    if (existingId) {
      if (!onRemoveBonus) return
      onRemoveBonus(existingId)
      setAppliedIds((prev) => {
        const next = new Map(prev)
        next.delete(opt.name)
        return next
      })
      return
    }
    if (!onApplyBonus) return
    const newId = onApplyBonus(opt.bonus)
    setAppliedIds((prev) => new Map(prev).set(opt.name, newId))
  }

  return (
    <div className="rounded-lg border border-gray-400 bg-background-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-gray-1000 transition hover:bg-gray-100"
        aria-expanded={open}
      >
        <span>{label}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul className="divide-y divide-gray-400 border-t border-gray-400">
          {options.map((opt) => {
            const baseCost = parseInt(opt.cost, 10)
            const affordable = !isNaN(baseCost) && triggerCount >= baseCost
            const wasApplied = appliedIds.has(opt.name)
            // Non-stackable bonuses (Flow) can't be applied a second time
            // while one with the same source already lives on the character.
            const blockedByExisting =
              !!opt.bonus &&
              opt.bonus.stackable === false &&
              !wasApplied &&
              !!currentBonuses?.some((b) => b.source === opt.bonus!.source)
            const canToggle =
              !!opt.bonus &&
              (wasApplied
                ? !!onRemoveBonus
                : !!onApplyBonus && affordable && !blockedByExisting)
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
                {opt.bonus && onApplyBonus && (
                  <Button
                    variant={
                      wasApplied || blockedByExisting ? 'secondary' : 'subtle'
                    }
                    size="xs"
                    disabled={!canToggle}
                    onClick={() => handleToggle(opt)}
                    className="shrink-0 self-start"
                    title={
                      wasApplied
                        ? 'Click to remove from your pending bonuses'
                        : blockedByExisting
                          ? 'Already on your character — remove the chip from your sheet to re-apply'
                          : affordable
                            ? 'Persist this bonus on your character for the next roll'
                            : 'Not enough triggers'
                    }
                  >
                    {wasApplied || blockedByExisting ? '✓ Applied' : 'Apply'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * Weapon-specific trigger options — resolved via lookupQuality from
 * item-qualities.json. These don't carry a standardised numeric cost
 * (the rulebook describes them in prose), so we render them without a
 * cost pill; the player decides what to spend based on the effect text.
 */
function WeaponTriggerPanel({
  names,
  defaultOpen = false,
}: {
  names: string[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const resolved = names
    .map((raw) => {
      const { name, level } = parseQuality(raw)
      const quality = lookupQuality(name)
      return quality
        ? {
            display: level !== null ? `${name} (${level})` : name,
            effect: quality.effect,
          }
        : null
    })
    .filter((x): x is { display: string; effect: string } => x !== null)
  if (resolved.length === 0) return null
  return (
    <div className="rounded-lg border border-accent-700/40 bg-background-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-gray-1000 transition hover:bg-gray-100"
        aria-expanded={open}
      >
        <span>Weapon triggers</span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul className="divide-y divide-gray-400 border-t border-accent-700/40">
          {resolved.map((opt) => (
            <li key={opt.display} className="px-3 py-2 text-xs text-gray-1000">
              <p className="font-medium text-accent-900">{opt.display}</p>
              <p className="mt-0.5 whitespace-pre-line leading-snug">
                {opt.effect}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <IconChevronDown
      size={12}
      aria-hidden
      className={`shrink-0 text-gray-700 transition-transform ${open ? 'rotate-180' : ''}`}
    />
  )
}
