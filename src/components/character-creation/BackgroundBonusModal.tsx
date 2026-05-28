import { useMemo, useState } from 'react'
import { Modal } from '~/components/ui/Modal'
import { Button } from '~/components/ui/Button'
import {
  ATTRIBUTE_DEFINITIONS,
  type AttributeId,
} from '~/lib/game-logic/attributes'
import { SKILLS } from '~/lib/game-logic/skills'
import {
  attributeChoicesFor,
  bonusNeedsChoice,
  resolveFixed,
  skillChoicesFor,
  talentChoicesFor,
  type BackgroundBonus,
  type LeafBonus,
  type ResolvedBonus,
} from '~/lib/game-logic/background-bonuses'
import type { CareerData } from '~/lib/game-logic/talents'
import talentsData from '~/data/talents.json'

interface TalentMeta {
  name: string
  description: string
}
const TALENT_DESCRIPTIONS = new Map(
  (talentsData as TalentMeta[]).map((t) => [t.name, t.description]),
)
const SKILL_NAMES = new Map(SKILLS.map((s) => [s.id, s.name]))
const ATTRIBUTE_NAMES = new Map(
  ATTRIBUTE_DEFINITIONS.map((a) => [a.id, a.name as string]),
)

interface BackgroundBonusModalProps {
  entryName: string
  bonuses: BackgroundBonus[]
  primaryCareerName: string | null
  careers: CareerData[]
  /** Already-resolved bonuses if the modal is being re-opened. */
  initial?: ResolvedBonus[]
  /** Talent names the player already holds (career picks + other granted bonuses). Filtered out of choose-talent results. */
  excludeTalentIds?: Set<string>
  onConfirm: (resolved: ResolvedBonus[]) => void
  onCancel: () => void
}

/**
 * Holds the in-progress UI state for the bonuses on a single background
 * entry — one slot per source bonus, with the per-slot UI state shaped
 * by that bonus's kind.
 */
type SlotState =
  | { kind: 'fixed'; resolved: ResolvedBonus }
  | {
      kind: 'choose-talent'
      selected: string | null
      spec: Extract<BackgroundBonus, { kind: 'choose-talent' }>
    }
  | {
      kind: 'attribute-choice'
      selected: AttributeId | null
      by: number
      spec: Extract<BackgroundBonus, { kind: 'attribute-choice' }>
    }
  | {
      kind: 'skill-choice'
      selected: string | null
      by: number
      spec: Extract<BackgroundBonus, { kind: 'skill-choice' }>
    }
  | {
      kind: 'one-of'
      branch: number | null
      sub: SlotState | null
      spec: Extract<BackgroundBonus, { kind: 'one-of' }>
    }

function initialSlotFor(bonus: BackgroundBonus): SlotState {
  if (bonus.kind === 'one-of') {
    return { kind: 'one-of', branch: null, sub: null, spec: bonus }
  }
  if (bonus.kind === 'choose-talent') {
    return { kind: 'choose-talent', selected: null, spec: bonus }
  }
  if (bonus.kind === 'attribute-choice') {
    return {
      kind: 'attribute-choice',
      selected: null,
      by: bonus.by,
      spec: bonus,
    }
  }
  if (bonus.kind === 'skill-choice') {
    return { kind: 'skill-choice', selected: null, by: bonus.by, spec: bonus }
  }
  const fixed = resolveFixed(bonus)
  if (!fixed) throw new Error(`Unexpected unresolvable leaf: ${bonus.kind}`)
  return { kind: 'fixed', resolved: fixed }
}

function slotIsResolved(s: SlotState): boolean {
  switch (s.kind) {
    case 'fixed':
      return true
    case 'choose-talent':
    case 'attribute-choice':
    case 'skill-choice':
      return s.selected !== null
    case 'one-of':
      return s.branch !== null && s.sub !== null && slotIsResolved(s.sub)
  }
}

function slotResolution(s: SlotState): ResolvedBonus | null {
  switch (s.kind) {
    case 'fixed':
      return s.resolved
    case 'choose-talent':
      return s.selected ? { kind: 'choose-talent', talentId: s.selected } : null
    case 'attribute-choice':
      return s.selected
        ? { kind: 'attribute-choice', attribute: s.selected, by: s.by }
        : null
    case 'skill-choice':
      return s.selected
        ? { kind: 'skill-choice', skill: s.selected, by: s.by }
        : null
    case 'one-of':
      return s.sub ? slotResolution(s.sub) : null
  }
}

export function BackgroundBonusModal({
  entryName,
  bonuses,
  primaryCareerName,
  careers,
  initial,
  excludeTalentIds,
  onConfirm,
  onCancel,
}: BackgroundBonusModalProps) {
  const [slots, setSlots] = useState<SlotState[]>(() =>
    bonuses.map((b, i) => seedSlot(b, initial?.[i])),
  )

  const allResolved = useMemo(() => slots.every(slotIsResolved), [slots])

  function updateSlot(i: number, next: SlotState) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? next : s)))
  }

  function confirm() {
    const resolved: ResolvedBonus[] = []
    for (const s of slots) {
      const r = slotResolution(s)
      if (!r) return
      resolved.push(r)
    }
    onConfirm(resolved)
  }

  return (
    <Modal
      onClose={onCancel}
      title={`${entryName} — bonuses`}
      subtitle="Resolve each choice below to apply it to your character."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!allResolved}>
            Confirm
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {slots.map((slot, i) => (
          <SlotBlock
            key={i}
            slot={slot}
            onChange={(next) => updateSlot(i, next)}
            primaryCareerName={primaryCareerName}
            careers={careers}
            excludeTalentIds={excludeTalentIds}
          />
        ))}
      </div>
    </Modal>
  )
}

function seedSlot(
  b: BackgroundBonus,
  init: ResolvedBonus | undefined,
): SlotState {
  const fresh = initialSlotFor(b)
  if (!init) return fresh
  return hydrateSlot(fresh, init)
}

function hydrateSlot(slot: SlotState, init: ResolvedBonus): SlotState {
  switch (slot.kind) {
    case 'choose-talent':
      return init.kind === 'choose-talent'
        ? { ...slot, selected: init.talentId }
        : slot
    case 'attribute-choice':
      return init.kind === 'attribute-choice'
        ? { ...slot, selected: init.attribute }
        : slot
    case 'skill-choice':
      return init.kind === 'skill-choice'
        ? { ...slot, selected: init.skill }
        : slot
    case 'one-of': {
      const branchIdx = slot.spec.options.findIndex((opt) =>
        sameLeafShape(opt, init),
      )
      if (branchIdx === -1) return slot
      const branchSpec = slot.spec.options[branchIdx]
      const sub = bonusNeedsChoice(branchSpec)
        ? hydrateSlot(initialSlotFor(branchSpec), init)
        : initialSlotFor(branchSpec)
      return { ...slot, branch: branchIdx, sub }
    }
    case 'fixed':
      return slot
  }
}

function sameLeafShape(opt: LeafBonus, init: ResolvedBonus): boolean {
  return opt.kind === init.kind
}

interface SlotBlockProps {
  slot: SlotState
  onChange: (next: SlotState) => void
  primaryCareerName: string | null
  careers: CareerData[]
  excludeTalentIds?: Set<string>
}

function SlotBlock({
  slot,
  onChange,
  primaryCareerName,
  careers,
  excludeTalentIds,
}: SlotBlockProps) {
  switch (slot.kind) {
    case 'fixed':
      return <FixedRow resolved={slot.resolved} />
    case 'choose-talent':
      return (
        <TalentChoiceBlock
          slot={slot}
          onChange={onChange}
          primaryCareerName={primaryCareerName}
          careers={careers}
          excludeTalentIds={excludeTalentIds}
        />
      )
    case 'attribute-choice':
      return <AttributeChoiceBlock slot={slot} onChange={onChange} />
    case 'skill-choice':
      return <SkillChoiceBlock slot={slot} onChange={onChange} />
    case 'one-of':
      return (
        <OneOfBlock
          slot={slot}
          onChange={onChange}
          primaryCareerName={primaryCareerName}
          careers={careers}
          excludeTalentIds={excludeTalentIds}
        />
      )
  }
}

function FixedRow({ resolved }: { resolved: ResolvedBonus }) {
  return (
    <div className="rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-gray-1000">
      <span className="font-medium text-white">Applied automatically: </span>
      <ResolvedSummary resolved={resolved} />
    </div>
  )
}

function ResolvedSummary({ resolved }: { resolved: ResolvedBonus }) {
  switch (resolved.kind) {
    case 'grant-talent':
    case 'choose-talent':
      return <>Grants the {resolved.talentId} talent.</>
    case 'attribute-bump':
    case 'attribute-choice':
      return (
        <>
          {ATTRIBUTE_NAMES.get(resolved.attribute) ?? resolved.attribute}{' '}
          {formatDelta(resolved.by)}
        </>
      )
    case 'skill-bump':
    case 'skill-choice':
      return (
        <>
          {SKILL_NAMES.get(resolved.skill) ?? resolved.skill}{' '}
          {formatDelta(resolved.by)} levels
        </>
      )
    case 'asset-delta':
      return <>{formatDelta(resolved.by)} Assets</>
    case 'credit-delta':
      return <>{formatDelta(resolved.by)} Credits</>
    case 'max-health-bump':
      return <>Max Health {formatDelta(resolved.by)}</>
    case 'max-edge-bump':
      return <>Max Edge {formatDelta(resolved.by)}</>
    case 'cyber-immunity-bump':
      return <>Cyber Immunity {formatDelta(resolved.by)}</>
    case 'skill-points-bonus':
      return <>{formatDelta(resolved.by)} creation skill points</>
  }
}

function formatDelta(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

interface TalentChoiceBlockProps {
  slot: Extract<SlotState, { kind: 'choose-talent' }>
  onChange: (next: SlotState) => void
  primaryCareerName: string | null
  careers: CareerData[]
  excludeTalentIds?: Set<string>
}

function TalentChoiceBlock({
  slot,
  onChange,
  primaryCareerName,
  careers,
  excludeTalentIds,
}: TalentChoiceBlockProps) {
  const choices = useMemo(
    () => talentChoicesFor(slot.spec, primaryCareerName, careers),
    [slot.spec, primaryCareerName, careers],
  )
  // Dedupe by talent name across careers (granted entry doesn't track career),
  // then drop anything the player already holds elsewhere.
  const deduped = useMemo(() => {
    const seen = new Set<string>()
    const out: typeof choices = []
    for (const c of choices) {
      if (seen.has(c.talent)) continue
      if (excludeTalentIds?.has(c.talent)) continue
      seen.add(c.talent)
      out.push(c)
    }
    return out
  }, [choices, excludeTalentIds])

  return (
    <div className="rounded-lg border border-gray-400 bg-gray-100 p-3">
      <h4 className="mb-2 text-xs uppercase tracking-wide text-gray-700">
        Choose a talent
      </h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {deduped.map((c) => {
          const selected = slot.selected === c.talent
          return (
            <button
              key={c.talent}
              onClick={() => onChange({ ...slot, selected: c.talent })}
              className={`rounded-lg border p-2 text-left text-sm transition ${
                selected
                  ? 'border-accent-700 bg-accent-700/10 text-white'
                  : 'border-gray-400 bg-background-200 text-gray-1000 hover:border-accent-700'
              }`}
            >
              <div className="font-medium text-white">{c.talent}</div>
              <div className="text-[11px] uppercase tracking-wide text-gray-700">
                {c.careerName} · tier {c.tier}
              </div>
              <div className="mt-1 line-clamp-3 text-xs text-gray-900">
                {TALENT_DESCRIPTIONS.get(c.talent) ?? ''}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface AttributeChoiceBlockProps {
  slot: Extract<SlotState, { kind: 'attribute-choice' }>
  onChange: (next: SlotState) => void
}

function AttributeChoiceBlock({ slot, onChange }: AttributeChoiceBlockProps) {
  const ids = useMemo(() => attributeChoicesFor(slot.spec), [slot.spec])
  return (
    <div className="rounded-lg border border-gray-400 bg-gray-100 p-3">
      <h4 className="mb-2 text-xs uppercase tracking-wide text-gray-700">
        Choose an attribute to bump {formatDelta(slot.by)}
      </h4>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const def = ATTRIBUTE_DEFINITIONS.find((a) => a.id === id)!
          const selected = slot.selected === id
          return (
            <button
              key={id}
              onClick={() => onChange({ ...slot, selected: id })}
              title={def.name}
              className={`rounded-lg border px-3 py-1 text-sm transition ${
                selected
                  ? 'border-accent-700 bg-accent-700/20 text-white'
                  : 'border-gray-400 bg-background-200 text-gray-1000 hover:border-accent-700'
              }`}
            >
              {def.abbr}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface SkillChoiceBlockProps {
  slot: Extract<SlotState, { kind: 'skill-choice' }>
  onChange: (next: SlotState) => void
}

function SkillChoiceBlock({ slot, onChange }: SkillChoiceBlockProps) {
  const ids = useMemo(() => skillChoicesFor(slot.spec), [slot.spec])
  // Short lists (2-3 skills, like Firearms/Melee) read better as full-width
  // buttons; longer lists stay in a 2-col grid so 24 skills don't sprawl.
  const stacked = ids.length <= 3
  return (
    <div className="rounded-lg border border-gray-400 bg-gray-100 p-3">
      <h4 className="mb-2 text-xs uppercase tracking-wide text-gray-700">
        Choose a skill to bump {formatDelta(slot.by)} levels
      </h4>
      <div className={stacked ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
        {ids.map((id) => {
          const selected = slot.selected === id
          return (
            <button
              key={id}
              onClick={() => onChange({ ...slot, selected: id })}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                selected
                  ? 'border-accent-700 bg-accent-700/10 text-white'
                  : 'border-gray-400 bg-background-200 text-gray-1000 hover:border-accent-700'
              }`}
            >
              {SKILL_NAMES.get(id) ?? id}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface OneOfBlockProps {
  slot: Extract<SlotState, { kind: 'one-of' }>
  onChange: (next: SlotState) => void
  primaryCareerName: string | null
  careers: CareerData[]
  excludeTalentIds?: Set<string>
}

function OneOfBlock({
  slot,
  onChange,
  primaryCareerName,
  careers,
  excludeTalentIds,
}: OneOfBlockProps) {
  function pickBranch(idx: number) {
    const branchSpec = slot.spec.options[idx]
    const sub = initialSlotFor(branchSpec)
    onChange({ ...slot, branch: idx, sub })
  }
  return (
    <div className="rounded-lg border border-gray-400 bg-gray-100 p-3">
      <h4 className="mb-2 text-xs uppercase tracking-wide text-gray-700">
        Choose one option
      </h4>
      <div className="space-y-2">
        {slot.spec.options.map((opt, idx) => {
          const selected = slot.branch === idx
          return (
            <div key={idx}>
              <button
                onClick={() => pickBranch(idx)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selected
                    ? 'border-accent-700 bg-accent-700/10 text-white'
                    : 'border-gray-400 bg-background-200 text-gray-1000 hover:border-accent-700'
                }`}
              >
                <BranchLabel option={opt} />
              </button>
              {selected && slot.sub && bonusNeedsChoice(opt) && (
                <div className="mt-2">
                  <SlotBlock
                    slot={slot.sub}
                    onChange={(next) => onChange({ ...slot, sub: next })}
                    primaryCareerName={primaryCareerName}
                    careers={careers}
                    excludeTalentIds={excludeTalentIds}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BranchLabel({ option }: { option: LeafBonus }) {
  switch (option.kind) {
    case 'grant-talent':
      return <>Gain the {option.talentId} talent</>
    case 'choose-talent':
      return <>Choose a talent</>
    case 'attribute-bump':
      return (
        <>
          {ATTRIBUTE_NAMES.get(option.attribute) ?? option.attribute}{' '}
          {formatDelta(option.by)}
        </>
      )
    case 'attribute-choice':
      return <>Choose an attribute to bump {formatDelta(option.by)}</>
    case 'skill-bump':
      return (
        <>
          {SKILL_NAMES.get(option.skill) ?? option.skill}{' '}
          {formatDelta(option.by)} levels
        </>
      )
    case 'skill-choice':
      return <>Choose a skill to bump {formatDelta(option.by)} levels</>
    case 'asset-delta':
      return <>{formatDelta(option.by)} Assets</>
    case 'credit-delta':
      return <>{formatDelta(option.by)} Credits</>
    case 'max-health-bump':
      return <>Max Health {formatDelta(option.by)}</>
    case 'max-edge-bump':
      return <>Max Edge {formatDelta(option.by)}</>
    case 'cyber-immunity-bump':
      return <>Cyber Immunity {formatDelta(option.by)}</>
    case 'skill-points-bonus':
      return <>{formatDelta(option.by)} creation skill points</>
  }
}
