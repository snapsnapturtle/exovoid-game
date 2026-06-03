import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createCharacter } from '~/lib/server/characters'
import { computeAllDerivedStats } from '~/lib/game-logic/derived-stats'
import {
  ATTRIBUTE_DEFINITIONS,
  TOTAL_ATTRIBUTE_POINTS,
  CREATION_HIGH_CAP,
  CREATION_HIGH_COUNT,
  CREATION_LOW_CAP,
  type AttributeId,
} from '~/lib/game-logic/attributes'
import { SKILLS } from '~/lib/game-logic/skills'
import { isLegalTalentSet, makeTalentEntry } from '~/lib/game-logic/talents'
import {
  CREATION_SKILL_MAX,
  CREATION_SKILL_POINTS,
  CREATION_TALENT_LIMIT,
  CREATION_TALENT_MAX_TIER,
  pointsForSkillLevel,
  validateCreation,
} from '~/lib/game-logic/character-creation'
import type {
  CharacterAttributes,
  DerivedStatBonuses,
  TalentEntry,
} from '~/lib/types/database'
import careersData from '~/data/careers.json'
import backgroundsData from '~/data/backgrounds.json'
import { Button } from '~/components/ui/Button'
import { InlineStepper } from '~/components/ui/InlineStepper'
import { Alert } from '~/components/ui/Alert'
import { Input, Select } from '~/components/ui/Input'
import { BackgroundBonusModal } from './BackgroundBonusModal'
import {
  bonusNeedsChoice,
  projectResolvedBonuses,
  resolveFixed,
  type BackgroundBonus,
  type LeafBonus,
  type ResolvedBonus,
} from '~/lib/game-logic/background-bonuses'

// ---------- Types and rule constants ----------

const CAREER_SKILL_NAME_TO_ID = new Map<string, string>()
SKILLS.forEach((s) => CAREER_SKILL_NAME_TO_ID.set(s.name.toLowerCase(), s.id))

interface CareerJson {
  name: string
  description: string
  startingSkills: { name: string; level: number }[]
  startingEquipment: string[]
  talents: { talent: string; tier: number }[]
}
const careers = careersData as CareerJson[]

interface BackgroundEntry {
  id: number
  name: string
  description: string
  bonus: string
  bonuses?: BackgroundBonus[]
}
const backgrounds = backgroundsData as {
  origin: BackgroundEntry[]
  childhood: BackgroundEntry[]
  adolescence: BackgroundEntry[]
  lifeEvents: BackgroundEntry[]
}

type BgKey =
  | 'origin'
  | 'childhood'
  | 'adolescence'
  | 'lifeEvent1'
  | 'lifeEvent2'

const BG_KEYS: BgKey[] = [
  'origin',
  'childhood',
  'adolescence',
  'lifeEvent1',
  'lifeEvent2',
]
const BG_LABEL: Record<BgKey, string> = {
  origin: 'Origin',
  childhood: 'Childhood',
  adolescence: 'Adolescence',
  lifeEvent1: 'Life Event #1',
  lifeEvent2: 'Life Event #2',
}
function bgTable(key: BgKey): BackgroundEntry[] {
  if (key === 'origin') return backgrounds.origin
  if (key === 'childhood') return backgrounds.childhood
  if (key === 'adolescence') return backgrounds.adolescence
  return backgrounds.lifeEvents
}

interface BgPick {
  mode: 'roll' | 'manual'
  rolls: number[]
  chosen: number | null
  /**
   * Resolved bonuses for the chosen entry. `null` means the entry has no
   * structured bonuses (textual only) OR the modal hasn't been completed
   * yet. We distinguish "needs resolution" from "doesn't need any" via the
   * entry's `bonuses` array, not this field.
   */
  resolvedBonuses: ResolvedBonus[] | null
}

interface State {
  step: number
  // Career
  career: string | null
  startingTalents: string[]
  // Attributes
  highCapAttrs: AttributeId[]
  baseAttributes: CharacterAttributes
  // Background
  bg: Record<BgKey, BgPick>
  extraRollsAppliedTo: BgKey | null
  /** Which background entry is currently showing its bonus-resolution modal. */
  bonusModalFor: BgKey | null
  // Skills (user-spent levels on top of career baseline)
  skillsSpent: Record<string, number>
  // Final touches
  name: string
  gender: string
  age: string // string so the input is friendly; parsed at submit
  // Submit
  submitting: boolean
  error: string | null
}

const initialAttributes: CharacterAttributes = {
  con: 0,
  str: 0,
  agi: 0,
  int: 0,
  edu: 0,
  per: 0,
  coo: 0,
}

const STEP_LABELS = [
  'Career',
  'Attributes',
  'Background',
  'Skills',
  'Final touches',
  'Review',
]

// ---------- Derivations ----------

function uniqueRolls(
  count: number,
  max: number,
  exclude: number[] = [],
): number[] {
  const out = [...exclude]
  while (out.length < count + exclude.length) {
    const r = Math.floor(Math.random() * max) + 1
    if (!out.includes(r)) out.push(r)
  }
  return out
}

function careerSkillBaseline(
  careerName: string | null,
): Record<string, number> {
  if (!careerName) return {}
  const career = careers.find((c) => c.name === careerName)
  if (!career) return {}
  const map: Record<string, number> = {}
  for (const s of career.startingSkills) {
    const id = CAREER_SKILL_NAME_TO_ID.get(s.name.toLowerCase())
    if (id) map[id] = s.level
  }
  return map
}

interface ChosenBonus {
  table: BgKey
  entry: BackgroundEntry
}

function chosenBackgroundBonuses(state: State): ChosenBonus[] {
  const out: ChosenBonus[] = []
  for (const k of BG_KEYS) {
    const pick = state.bg[k]
    if (pick.chosen == null) continue
    const entry = bgTable(k).find((e) => e.id === pick.chosen)
    if (!entry) continue
    out.push({ table: k, entry })
  }
  return out
}

function attrCap(state: State, id: AttributeId): number {
  return state.highCapAttrs.includes(id) ? CREATION_HIGH_CAP : CREATION_LOW_CAP
}

function totalSkillPointsSpent(
  state: State,
  baseline: Record<string, number>,
): number {
  let total = 0
  for (const skill of SKILLS) {
    const base = baseline[skill.id] ?? 0
    const spent = state.skillsSpent[skill.id] ?? 0
    const final = base + spent
    total += pointsForSkillLevel(final) - pointsForSkillLevel(base)
  }
  return total
}

// ---------- Component ----------

interface CreationWizardProps {
  gameId: string
}

export function CreationWizard({ gameId }: CreationWizardProps) {
  const navigate = useNavigate()
  const [state, setState] = useState<State>(() => ({
    step: 0,
    career: null,
    startingTalents: [],
    highCapAttrs: [],
    baseAttributes: { ...initialAttributes },
    bg: {
      origin: { mode: 'roll', rolls: [], chosen: null, resolvedBonuses: null },
      childhood: {
        mode: 'roll',
        rolls: [],
        chosen: null,
        resolvedBonuses: null,
      },
      adolescence: {
        mode: 'roll',
        rolls: [],
        chosen: null,
        resolvedBonuses: null,
      },
      lifeEvent1: {
        mode: 'roll',
        rolls: [],
        chosen: null,
        resolvedBonuses: null,
      },
      lifeEvent2: {
        mode: 'roll',
        rolls: [],
        chosen: null,
        resolvedBonuses: null,
      },
    },
    extraRollsAppliedTo: null,
    bonusModalFor: null,
    skillsSpent: {},
    name: '',
    gender: '',
    age: '',
    submitting: false,
    error: null,
  }))

  const skillBaseline = useMemo(
    () => careerSkillBaseline(state.career),
    [state.career],
  )

  const bgChosen = useMemo(() => chosenBackgroundBonuses(state), [state])

  // Flat list of every resolved bonus across the 5 background slots, plus its
  // projected aggregate used at submit time and to size the skills budget.
  const allResolvedBonuses = useMemo(() => {
    const out: ResolvedBonus[] = []
    for (const k of BG_KEYS) {
      const r = state.bg[k].resolvedBonuses
      if (r) out.push(...r)
    }
    return out
  }, [state.bg])
  const bonusProjection = useMemo(
    () => projectResolvedBonuses(allResolvedBonuses),
    [allResolvedBonuses],
  )

  const baseAttrPointsUsed = useMemo(
    () =>
      Object.values(state.baseAttributes).reduce((sum, v) => sum + (v ?? 0), 0),
    [state.baseAttributes],
  )
  const baseAttrPointsRemaining = TOTAL_ATTRIBUTE_POINTS - baseAttrPointsUsed

  const skillsUsed = useMemo(
    () => totalSkillPointsSpent(state, skillBaseline),
    [state.skillsSpent, skillBaseline],
  )
  // Background "skill-points-bonus" entries widen (or narrow) the budget;
  // they're a strictly creation-time effect with no character-row impact.
  const skillsBudget = CREATION_SKILL_POINTS + bonusProjection.skillPointsBonus
  const skillsRemaining = skillsBudget - skillsUsed

  // Authoritative pre-submit check — same logic the server runs. The
  // step-level checks should keep this passing throughout the wizard;
  // it acts as a final guard plus a place to render rule violations.
  const validation = useMemo(() => {
    if (!state.career) return { ok: true, errors: [] }
    const careerData = careers.find((c) => c.name === state.career)
    if (!careerData) return { ok: true, errors: [] }
    const baseFinalSkills: Record<string, number> = { ...skillBaseline }
    for (const [id, spent] of Object.entries(state.skillsSpent)) {
      baseFinalSkills[id] = (baseFinalSkills[id] ?? 0) + spent
    }
    const finalSkills: Record<string, number> = { ...baseFinalSkills }
    for (const [id, delta] of Object.entries(bonusProjection.skillDeltas)) {
      finalSkills[id] = (finalSkills[id] ?? 0) + delta
    }
    const finalAttrs: CharacterAttributes = { ...state.baseAttributes }
    for (const [id, delta] of Object.entries(bonusProjection.attributeDeltas)) {
      const a = id as AttributeId
      finalAttrs[a] = finalAttrs[a] + (delta ?? 0)
    }
    const talentEntries: TalentEntry[] = state.startingTalents.map((name) => {
      const ref = careerData.talents.find((t) => t.talent === name)
      return makeTalentEntry(name, state.career!, ref?.tier ?? 0, 0)
    })
    for (const talentId of bonusProjection.grantedTalentNames) {
      if (talentEntries.some((t) => t.name === talentId)) continue
      const entry = makeTalentEntry(talentId, '', 0, 0)
      entry.granted = true
      talentEntries.push(entry)
    }
    return validateCreation(
      {
        careerName: state.career,
        attributes: finalAttrs,
        baseAttributes: state.baseAttributes,
        finalSkills,
        baseFinalSkills,
        talents: talentEntries,
        skillPointsBudget:
          CREATION_SKILL_POINTS + bonusProjection.skillPointsBonus,
      },
      careers,
    )
  }, [
    state.career,
    state.baseAttributes,
    state.skillsSpent,
    state.startingTalents,
    skillBaseline,
    bonusProjection,
  ])

  // Step validation
  const stepValid = useMemo(() => {
    switch (state.step) {
      case 0:
        return state.career != null && state.startingTalents.length <= 2
      case 1:
        return (
          baseAttrPointsRemaining === 0 &&
          state.highCapAttrs.length === CREATION_HIGH_COUNT &&
          ATTRIBUTE_DEFINITIONS.every(
            (a) => state.baseAttributes[a.id] <= attrCap(state, a.id),
          )
        )
      case 2:
        return BG_KEYS.every((k) => {
          const pick = state.bg[k]
          if (pick.chosen == null) return false
          const entry = bgTable(k).find((e) => e.id === pick.chosen)
          const needsChoice = (entry?.bonuses ?? []).some(bonusNeedsChoice)
          return needsChoice ? pick.resolvedBonuses != null : true
        })
      case 3:
        return skillsRemaining >= 0
      case 4:
        return state.name.trim().length > 0
      default:
        return true
    }
  }, [state, baseAttrPointsRemaining, skillsRemaining])

  function setStep(step: number) {
    setState((s) => ({ ...s, step }))
  }

  async function submit() {
    setState((s) => ({ ...s, submitting: true, error: null }))
    try {
      // Skill points spent by the player on top of their career baseline;
      // then background skill-bumps layered on top.
      const finalSkills: Record<string, number> = { ...skillBaseline }
      for (const [id, spent] of Object.entries(state.skillsSpent)) {
        finalSkills[id] = (finalSkills[id] ?? 0) + spent
      }
      for (const [id, delta] of Object.entries(bonusProjection.skillDeltas)) {
        finalSkills[id] = (finalSkills[id] ?? 0) + delta
      }

      const finalAttrs: CharacterAttributes = { ...state.baseAttributes }
      for (const [id, delta] of Object.entries(
        bonusProjection.attributeDeltas,
      )) {
        const a = id as AttributeId
        finalAttrs[a] = finalAttrs[a] + (delta ?? 0)
      }

      // The textual `bonus` still lands in notes for everything the player
      // chose. Entries that have NO mechanised bonuses get a `[ ]` checkbox
      // prefix so the player has a quick visual reminder to apply them by
      // hand at the table; mechanised entries are marked `[x]`.
      const noteLines = [
        'Background bonuses (text record):',
        ...bgChosen.map(({ table, entry }) => {
          const isMechanised = (entry.bonuses?.length ?? 0) > 0
          const prefix = isMechanised ? '[x]' : '[ ]'
          return `  ${prefix} ${BG_LABEL[table]} — ${entry.name}: ${entry.bonus}`
        }),
      ].join('\n')

      const careerName = state.career ?? ''
      const careerData = careers.find((c) => c.name === careerName)
      const talentEntries: TalentEntry[] = state.startingTalents.map((name) => {
        const ref = careerData?.talents.find((t) => t.talent === name)
        return makeTalentEntry(name, careerName, ref?.tier ?? 0, 0)
      })
      for (const talentId of bonusProjection.grantedTalentNames) {
        if (talentEntries.some((t) => t.name === talentId)) continue
        const entry = makeTalentEntry(talentId, '', 0, 0)
        entry.granted = true
        talentEntries.push(entry)
      }

      const derivedStatBonuses: DerivedStatBonuses = {}
      if (bonusProjection.derivedStatBonuses.maxHealth !== 0)
        derivedStatBonuses.maxHealth =
          bonusProjection.derivedStatBonuses.maxHealth
      if (bonusProjection.derivedStatBonuses.maxEdge !== 0)
        derivedStatBonuses.maxEdge = bonusProjection.derivedStatBonuses.maxEdge
      if (bonusProjection.derivedStatBonuses.cyberImmunity !== 0)
        derivedStatBonuses.cyberImmunity =
          bonusProjection.derivedStatBonuses.cyberImmunity

      const character = await createCharacter({
        data: {
          gameId,
          name: state.name.trim(),
          career: careerName,
          gender: state.gender.trim(),
          age: state.age.trim() ? parseInt(state.age.trim(), 10) : null,
          background_notes: noteLines,
          attributes: finalAttrs,
          baseAttributes: state.baseAttributes,
          skills: finalSkills,
          baseFinalSkills: (() => {
            const m: Record<string, number> = { ...skillBaseline }
            for (const [id, spent] of Object.entries(state.skillsSpent)) {
              m[id] = (m[id] ?? 0) + spent
            }
            return m
          })(),
          talents: talentEntries,
          credits: 1000 + bonusProjection.creditDelta,
          assets: bonusProjection.assetDelta,
          derived_stat_bonuses: derivedStatBonuses,
          skillPointsBudget:
            CREATION_SKILL_POINTS + bonusProjection.skillPointsBonus,
        },
      })

      navigate({
        to: '/games/$gameId/characters/$characterId',
        params: { gameId, characterId: character.id },
      })
    } catch (e) {
      setState((s) => ({
        ...s,
        submitting: false,
        error: e instanceof Error ? e.message : 'Failed to create character',
      }))
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Stepper step={state.step} onJump={(i) => i < state.step && setStep(i)} />

      <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
        {state.step === 0 && <CareerStep state={state} setState={setState} />}
        {state.step === 1 && (
          <AttributesStep
            state={state}
            setState={setState}
            pointsRemaining={baseAttrPointsRemaining}
          />
        )}
        {state.step === 2 && (
          <BackgroundStep state={state} setState={setState} />
        )}
        {state.step === 3 && (
          <SkillsStep
            state={state}
            setState={setState}
            baseline={skillBaseline}
            spent={skillsUsed}
            budget={skillsBudget}
            bonusDeltas={bonusProjection.skillDeltas}
          />
        )}
        {state.step === 4 && <FinalStep state={state} setState={setState} />}
        {state.step === 5 && (
          <ReviewStep
            state={state}
            baseline={skillBaseline}
            bgChosen={bgChosen}
            resolvedBonuses={allResolvedBonuses}
            validationErrors={validation.errors}
          />
        )}
      </div>

      {state.error && <Alert className="px-4 py-3">{state.error}</Alert>}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(Math.max(0, state.step - 1))}
          disabled={state.step === 0 || state.submitting}
        >
          ← Back
        </Button>
        {state.step < STEP_LABELS.length - 1 ? (
          <Button onClick={() => setStep(state.step + 1)} disabled={!stepValid}>
            Next →
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={state.submitting || !validation.ok}
          >
            {state.submitting ? 'Creating…' : 'Create Character'}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------- Stepper ----------

function Stepper({
  step,
  onJump,
}: {
  step: number
  onJump: (i: number) => void
}) {
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {STEP_LABELS.map((label, i) => {
        const active = i === step
        const done = i < step
        return (
          <li key={label}>
            <button
              onClick={() => onJump(i)}
              disabled={!done}
              className={`rounded-full px-3 py-1 transition ${
                active
                  ? 'bg-accent-700 text-white'
                  : done
                    ? 'bg-gray-100 text-gray-1000 hover:bg-gray-400'
                    : 'bg-background-200 text-gray-700'
              }`}
            >
              {i + 1}. {label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

// ---------- Step 1: Career ----------

function CareerStep({
  state,
  setState,
}: {
  state: State
  setState: React.Dispatch<React.SetStateAction<State>>
}) {
  const career = careers.find((c) => c.name === state.career)
  const availableTalents =
    career?.talents.filter((t) => t.tier <= CREATION_TALENT_MAX_TIER) ?? []
  const talentByName = new Map(career?.talents.map((t) => [t.talent, t]) ?? [])

  function pickCareer(name: string) {
    setState((s) => ({
      ...s,
      career: name,
      // Reset starting talents when career changes
      startingTalents: [],
    }))
  }

  function attemptToggle(name: string, tier: number) {
    setState((s) => {
      const has = s.startingTalents.includes(name)
      const next = has
        ? s.startingTalents.filter((t) => t !== name)
        : [...s.startingTalents, name]
      if (!has && next.length > CREATION_TALENT_LIMIT) return s
      const picks = next
        .map((n) => talentByName.get(n))
        .filter((t): t is { talent: string; tier: number } => Boolean(t))
      if (!isLegalTalentSet(picks)) return s
      return { ...s, startingTalents: next }
    })
    void tier
  }

  function reasonForDisable(name: string, tier: number): string | null {
    const has = state.startingTalents.includes(name)
    if (has) {
      // Removing — only blocked if it would orphan a higher-tier pick
      const tentative = state.startingTalents.filter((n) => n !== name)
      const picks = tentative
        .map((n) => talentByName.get(n))
        .filter((t): t is { talent: string; tier: number } => Boolean(t))
      if (!isLegalTalentSet(picks)) {
        return 'Removing this would leave a higher-tier talent without its prerequisite.'
      }
      return null
    }
    if (state.startingTalents.length >= CREATION_TALENT_LIMIT) {
      return 'Already at the 2-talent limit.'
    }
    const tentative = [...state.startingTalents, name]
    const picks = tentative
      .map((n) => talentByName.get(n))
      .filter((t): t is { talent: string; tier: number } => Boolean(t))
    if (!isLegalTalentSet(picks)) {
      return tier === 1
        ? 'Tier 1 requires a tier-0 prerequisite — pick a tier-0 first.'
        : `Tier ${tier} requires ${tier} prerequisite${tier === 1 ? '' : 's'}.`
    }
    return null
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Career</h2>
        <p className="mt-1 text-sm text-gray-900">
          Choose your character's primary career. You'll get its starting
          skills, equipment, and access to its talent tree. You may pick up to
          two starting talents from that tree, subject to tier prerequisites.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {careers.map((c) => (
          <button
            key={c.name}
            onClick={() => pickCareer(c.name)}
            className={`rounded-lg border p-3 text-left transition ${
              state.career === c.name
                ? 'border-accent-700 bg-accent-700/10'
                : 'border-gray-400 bg-gray-100 hover:border-accent-700'
            }`}
          >
            <div className="font-medium text-white">{c.name}</div>
            <div className="mt-1 line-clamp-2 text-xs text-gray-900">
              {c.description}
            </div>
          </button>
        ))}
      </div>

      {career && (
        <div className="space-y-4 rounded-lg border border-gray-400 bg-gray-100 p-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{career.name}</h3>
            <p className="mt-1 text-sm text-gray-1000">{career.description}</p>
          </div>

          <div>
            <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-700">
              Starting skills
            </h4>
            <ul className="text-sm text-gray-1000">
              {career.startingSkills.map((s) => (
                <li key={s.name}>
                  {s.name}: {s.level}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-1 text-xs uppercase tracking-wide text-gray-700">
              Starting equipment
            </h4>
            <ul className="text-sm text-gray-1000">
              {career.startingEquipment.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-2 text-xs uppercase tracking-wide text-gray-700">
              Choose up to 2 starting talents
            </h4>
            <p className="mb-2 text-xs text-gray-700">
              Tier 1 talents are unlocked by also picking a tier-0 prerequisite
              from the same career. With two picks you may take two tier-0
              talents, or one tier-0 plus one tier-1.
            </p>
            {[0, 1].map((tier) => {
              const list = availableTalents.filter((t) => t.tier === tier)
              if (list.length === 0) return null
              return (
                <div key={tier} className="mb-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-700">
                    Tier {tier}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {list.map((t) => {
                      const selected = state.startingTalents.includes(t.talent)
                      const blockedReason = reasonForDisable(t.talent, t.tier)
                      const disabled = blockedReason !== null
                      return (
                        <button
                          key={t.talent}
                          onClick={() => attemptToggle(t.talent, t.tier)}
                          disabled={disabled}
                          title={blockedReason ?? t.talent}
                          className={`rounded-lg border p-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            selected
                              ? 'border-accent-700 bg-accent-700/10 text-white'
                              : 'border-gray-400 bg-background-200 text-gray-1000 not-disabled:hover:border-accent-700'
                          }`}
                        >
                          {t.talent}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <p className="mt-2 text-xs text-gray-700">
              {state.startingTalents.length} / {CREATION_TALENT_LIMIT} selected
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Step 2: Attributes ----------

function AttributesStep({
  state,
  setState,
  pointsRemaining,
}: {
  state: State
  setState: React.Dispatch<React.SetStateAction<State>>
  pointsRemaining: number
}) {
  function setHighCap(id: AttributeId) {
    setState((s) => {
      const has = s.highCapAttrs.includes(id)
      let next: AttributeId[]
      if (has) next = s.highCapAttrs.filter((x) => x !== id)
      else if (s.highCapAttrs.length >= CREATION_HIGH_COUNT) return s
      else next = [...s.highCapAttrs, id]
      // If lowering cap drops a value above the new cap, clamp
      const clampedAttrs = { ...s.baseAttributes }
      ATTRIBUTE_DEFINITIONS.forEach((a) => {
        const cap = next.includes(a.id) ? CREATION_HIGH_CAP : CREATION_LOW_CAP
        if (clampedAttrs[a.id] > cap) clampedAttrs[a.id] = cap
      })
      return { ...s, highCapAttrs: next, baseAttributes: clampedAttrs }
    })
  }

  function adjust(id: AttributeId, delta: number) {
    setState((s) => {
      const cap = s.highCapAttrs.includes(id)
        ? CREATION_HIGH_CAP
        : CREATION_LOW_CAP
      const next = s.baseAttributes[id] + delta
      if (next < 0 || next > cap) return s
      const used = Object.values(s.baseAttributes).reduce(
        (sum, v) => sum + v,
        0,
      )
      if (delta > 0 && used >= TOTAL_ATTRIBUTE_POINTS) return s
      return {
        ...s,
        baseAttributes: { ...s.baseAttributes, [id]: next },
      }
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Attributes</h2>
        <p className="mt-1 text-sm text-gray-900">
          Distribute {TOTAL_ATTRIBUTE_POINTS} points across the seven
          attributes. Pick {CREATION_HIGH_COUNT} attributes that may go up to{' '}
          {CREATION_HIGH_CAP}; the rest are capped at {CREATION_LOW_CAP}.
        </p>
      </header>

      <div className="rounded-lg border border-gray-400 bg-gray-100 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-700">
          High-cap attributes ({state.highCapAttrs.length} /{' '}
          {CREATION_HIGH_COUNT})
        </p>
        <div className="flex flex-wrap gap-2">
          {ATTRIBUTE_DEFINITIONS.map((a) => {
            const selected = state.highCapAttrs.includes(a.id)
            const atLimit =
              state.highCapAttrs.length >= CREATION_HIGH_COUNT && !selected
            return (
              <button
                key={a.id}
                onClick={() => setHighCap(a.id)}
                disabled={atLimit}
                title={a.name}
                className={`rounded-lg border px-3 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? 'border-accent-700 bg-accent-700/20 text-white'
                    : 'border-gray-400 bg-background-200 text-gray-1000 not-disabled:hover:border-accent-700'
                }`}
              >
                {a.abbr}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p
          className={`mb-3 text-sm ${
            pointsRemaining === 0
              ? 'text-success-900'
              : pointsRemaining < 0
                ? 'text-danger-900'
                : 'text-warning-900'
          }`}
        >
          {pointsRemaining} of {TOTAL_ATTRIBUTE_POINTS} points remaining
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {ATTRIBUTE_DEFINITIONS.map((a) => {
            const value = state.baseAttributes[a.id]
            const cap = state.highCapAttrs.includes(a.id)
              ? CREATION_HIGH_CAP
              : CREATION_LOW_CAP
            return (
              <div
                key={a.id}
                className="flex flex-col items-center rounded-lg border border-gray-400 bg-gray-100 p-3"
                title={a.name}
              >
                <span className="text-[10px] uppercase tracking-wide text-gray-900">
                  {a.abbr}
                </span>
                <span className="my-1 text-2xl font-bold text-white">
                  {value}
                </span>
                <span className="text-[10px] text-gray-700">cap {cap}</span>
                <div className="mt-2 flex gap-1">
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => adjust(a.id, -1)}
                    disabled={value <= 0}
                    aria-label={`Decrease ${a.name}`}
                    className="w-5 px-0"
                  >
                    −
                  </Button>
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => adjust(a.id, +1)}
                    disabled={value >= cap || pointsRemaining <= 0}
                    aria-label={`Increase ${a.name}`}
                    className="w-5 px-0"
                  >
                    +
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------- Step 3: Background ----------

function BackgroundStep({
  state,
  setState,
}: {
  state: State
  setState: React.Dispatch<React.SetStateAction<State>>
}) {
  function rollTable(key: BgKey) {
    const max = bgTable(key).length
    setState((s) => ({
      ...s,
      bg: {
        ...s.bg,
        [key]: {
          mode: 'roll',
          rolls: uniqueRolls(2, max),
          chosen: null,
          resolvedBonuses: null,
        },
      },
      // Re-rolling clears the extra-dice flag if it was on this table
      extraRollsAppliedTo:
        s.extraRollsAppliedTo === key ? null : s.extraRollsAppliedTo,
    }))
  }

  function rollExtra(key: BgKey) {
    const max = bgTable(key).length
    setState((s) => {
      if (s.extraRollsAppliedTo) return s
      const existing = s.bg[key].rolls
      return {
        ...s,
        extraRollsAppliedTo: key,
        bg: {
          ...s.bg,
          [key]: {
            mode: 'roll',
            rolls: uniqueRolls(2, max, existing),
            chosen: null,
            resolvedBonuses: null,
          },
        },
      }
    })
  }

  function setManual(key: BgKey) {
    setState((s) => ({
      ...s,
      bg: {
        ...s.bg,
        [key]: {
          mode: 'manual',
          rolls: [],
          chosen: null,
          resolvedBonuses: null,
        },
      },
      extraRollsAppliedTo:
        s.extraRollsAppliedTo === key ? null : s.extraRollsAppliedTo,
    }))
  }

  function chooseEntry(key: BgKey, id: number) {
    setState((s) => {
      const entry = bgTable(key).find((e) => e.id === id)
      // Pre-resolve every fixed (non-choice) bonus. Anything that needs a
      // choice gets resolved later by the modal; the chosen entry stays
      // pending-resolution until then.
      const preResolved = (entry?.bonuses ?? [])
        .map((b) => (bonusNeedsChoice(b) ? null : resolveFixed(b as LeafBonus)))
        .filter((r): r is ResolvedBonus => r !== null)
      const hasChoices = (entry?.bonuses ?? []).some(bonusNeedsChoice)
      return {
        ...s,
        bg: {
          ...s.bg,
          [key]: {
            ...s.bg[key],
            chosen: id,
            // If no choices required, resolvedBonuses captures the auto-applied
            // leaves up front. If choices are required, wait for the modal.
            resolvedBonuses: hasChoices ? null : preResolved,
          },
        },
        bonusModalFor: hasChoices ? key : s.bonusModalFor,
      }
    })
  }

  function openBonusModalFor(key: BgKey) {
    setState((s) => ({ ...s, bonusModalFor: key }))
  }

  function closeBonusModal() {
    setState((s) => ({ ...s, bonusModalFor: null }))
  }

  function commitResolvedBonuses(key: BgKey, resolved: ResolvedBonus[]) {
    setState((s) => ({
      ...s,
      bg: { ...s.bg, [key]: { ...s.bg[key], resolvedBonuses: resolved } },
      bonusModalFor: null,
    }))
  }

  const modalEntry = (() => {
    const key = state.bonusModalFor
    if (!key) return null
    const pick = state.bg[key]
    if (pick.chosen == null) return null
    const entry = bgTable(key).find((e) => e.id === pick.chosen)
    if (!entry?.bonuses?.length) return null
    return { key, entry }
  })()

  // Collect talent names the player already holds via the career step, plus
  // granted talents resolved on other background slots. Passed to the modal
  // so the talent picker excludes duplicates.
  const heldTalentIdsExcludingActive = (() => {
    const out = new Set<string>(state.startingTalents)
    for (const k of BG_KEYS) {
      if (k === state.bonusModalFor) continue
      const resolved = state.bg[k].resolvedBonuses
      if (!resolved) continue
      for (const r of resolved) {
        if (r.kind === 'grant-talent' || r.kind === 'choose-talent')
          out.add(r.talentId)
      }
    }
    return out
  })()

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Background</h2>
        <p className="mt-1 text-sm text-gray-900">
          Roll twice on each table and choose one. Once across this step, you
          may roll two extra dice on a single table for more options.
          Mechanisable bonuses (attribute / skill / talent / wallet / derived-
          stat bumps) auto-apply on submission; narrative effects stay in your
          character notes.
        </p>
      </header>

      {BG_KEYS.map((key) => (
        <BackgroundTablePicker
          key={key}
          bgKey={key}
          state={state}
          onRoll={() => rollTable(key)}
          onRollExtra={() => rollExtra(key)}
          onSetManual={() => setManual(key)}
          onChoose={(id) => chooseEntry(key, id)}
          onOpenBonusModal={() => openBonusModalFor(key)}
        />
      ))}

      {modalEntry && (
        <BackgroundBonusModal
          entryName={modalEntry.entry.name}
          bonuses={modalEntry.entry.bonuses!}
          primaryCareerName={state.career}
          careers={careers}
          initial={state.bg[modalEntry.key].resolvedBonuses ?? undefined}
          excludeTalentIds={heldTalentIdsExcludingActive}
          onConfirm={(resolved) =>
            commitResolvedBonuses(modalEntry.key, resolved)
          }
          onCancel={closeBonusModal}
        />
      )}
    </div>
  )
}

function BackgroundTablePicker({
  bgKey,
  state,
  onRoll,
  onRollExtra,
  onSetManual,
  onChoose,
  onOpenBonusModal,
}: {
  bgKey: BgKey
  state: State
  onRoll: () => void
  onRollExtra: () => void
  onSetManual: () => void
  onChoose: (id: number) => void
  onOpenBonusModal: () => void
}) {
  const pick = state.bg[bgKey]
  const table = bgTable(bgKey)
  const max = table.length
  const die = max === 20 ? 'd20' : 'd10'
  const isManual = pick.mode === 'manual'
  const extraUsed =
    state.extraRollsAppliedTo !== null && state.extraRollsAppliedTo !== bgKey
  const canExtraHere =
    !isManual && pick.rolls.length === 2 && state.extraRollsAppliedTo === null
  const chosenEntry =
    pick.chosen != null ? table.find((e) => e.id === pick.chosen) : null
  const needsBonusChoice = chosenEntry?.bonuses?.some(bonusNeedsChoice) ?? false
  const bonusesResolved = pick.resolvedBonuses != null
  const showResolveButton = needsBonusChoice

  return (
    <section className="rounded-lg border border-gray-400 bg-gray-100 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">
          {BG_LABEL[bgKey]} <span className="text-gray-700">({die})</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {!isManual && pick.rolls.length === 0 && (
            <button
              onClick={onRoll}
              className="rounded bg-accent-700/20 px-3 py-1 text-sm text-accent-900 transition hover:bg-accent-700/30"
            >
              Roll
            </button>
          )}
          {!isManual && pick.rolls.length > 0 && (
            <button
              onClick={onRoll}
              className="rounded border border-gray-400 px-3 py-1 text-xs text-gray-900 transition hover:text-white"
            >
              Re-roll
            </button>
          )}
          {canExtraHere && (
            <button
              onClick={onRollExtra}
              className="rounded bg-warning-700/20 px-3 py-1 text-xs text-warning-900 transition hover:bg-warning-700/30"
              title="Use your once-per-step extra dice on this table"
            >
              +2 extra dice
            </button>
          )}
          {!isManual && state.extraRollsAppliedTo === bgKey && (
            <span className="rounded bg-warning-700/20 px-3 py-1 text-xs text-warning-900">
              +2 used
            </span>
          )}
          {!isManual && extraUsed && pick.rolls.length === 2 && (
            <span
              className="rounded border border-gray-400 px-3 py-1 text-xs text-gray-700"
              title="Extra dice already applied to another table"
            >
              extra unavailable
            </span>
          )}
          <button
            onClick={onSetManual}
            className={`rounded px-3 py-1 text-xs transition ${
              isManual
                ? 'bg-accent-700/20 text-accent-900'
                : 'border border-gray-400 text-gray-900 hover:text-white'
            }`}
            title="Skip the dice and pick directly from the table"
          >
            Choose manually
          </button>
        </div>
      </header>

      {isManual ? (
        <div className="space-y-2">
          <Select
            value={pick.chosen ?? ''}
            onChange={(e) => onChoose(parseInt(e.target.value, 10))}
            className="w-full"
          >
            <option value="">— pick an entry —</option>
            {table.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.id}. {entry.name}
              </option>
            ))}
          </Select>
          {chosenEntry && (
            <div className="rounded-lg border border-accent-700/40 bg-accent-700/5 p-3">
              <div className="font-medium text-white">{chosenEntry.name}</div>
              <div className="mt-1 text-xs text-gray-1000">
                {chosenEntry.description}
              </div>
              <div className="mt-2 text-xs text-accent-900">
                Bonus: {chosenEntry.bonus}
              </div>
            </div>
          )}
        </div>
      ) : pick.rolls.length === 0 ? (
        <p className="text-sm text-gray-700">
          Roll to see your options, or choose manually.
        </p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {pick.rolls.map((id) => {
            const entry = table.find((e) => e.id === id)
            if (!entry) return null
            const selected = pick.chosen === id
            return (
              <button
                key={id}
                onClick={() => onChoose(id)}
                className={`rounded-lg border p-3 text-left transition ${
                  selected
                    ? 'border-accent-700 bg-accent-700/10'
                    : 'border-gray-400 bg-background-200 hover:border-accent-700'
                }`}
              >
                <div className="text-xs text-gray-700">Rolled {entry.id}</div>
                <div className="font-medium text-white">{entry.name}</div>
                <div className="mt-1 line-clamp-3 text-xs text-gray-1000">
                  {entry.description}
                </div>
                <div className="mt-2 text-xs text-accent-900">
                  Bonus: {entry.bonus}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {chosenEntry && showResolveButton && (
        <div
          className={`mt-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
            bonusesResolved
              ? 'border-success-700/40 bg-success-700/10 text-success-900'
              : 'border-warning-700/40 bg-warning-700/10 text-warning-900'
          }`}
        >
          <span>
            {bonusesResolved
              ? 'Bonuses resolved.'
              : 'This entry needs a bonus choice — resolve to continue.'}
          </span>
          <button
            onClick={onOpenBonusModal}
            className="rounded border border-current px-2 py-0.5 transition hover:bg-white/5"
          >
            {bonusesResolved ? 'Change' : 'Resolve bonuses…'}
          </button>
        </div>
      )}
    </section>
  )
}

// ---------- Step 4: Skills ----------

function SkillsStep({
  state,
  setState,
  baseline,
  spent,
  budget,
  bonusDeltas,
}: {
  state: State
  setState: React.Dispatch<React.SetStateAction<State>>
  baseline: Record<string, number>
  spent: number
  budget: number
  bonusDeltas: Record<string, number>
}) {
  function adjust(id: string, delta: number) {
    setState((s) => {
      const base = baseline[id] ?? 0
      const bonus = bonusDeltas[id] ?? 0
      const current = s.skillsSpent[id] ?? 0
      const newSpent = current + delta
      if (newSpent < 0) return s
      // Creation cap (6) applies to the FINAL value — base + spent + bonus.
      // If base + bonus already exceeds the cap (forced by a background on
      // top of a chunky career baseline), the player can't add to it. Past
      // creation, skills can still rise to MAX_SKILL_LEVEL via leveling.
      if (base + newSpent + bonus > CREATION_SKILL_MAX) return s
      // Verify points budget — but only for increases. Decreases are always
      // allowed so a player who landed over budget (e.g. by changing a
      // background that no longer grants +3 skill points) can claw back.
      const tentative = { ...s.skillsSpent, [id]: newSpent }
      if (delta > 0) {
        let total = 0
        for (const sk of SKILLS) {
          const b = baseline[sk.id] ?? 0
          const c = tentative[sk.id] ?? 0
          total += pointsForSkillLevel(b + c) - pointsForSkillLevel(b)
        }
        if (total > budget) return s
      }
      return { ...s, skillsSpent: tentative }
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Further training</h2>
        <p className="mt-1 text-sm text-gray-900">
          You have {budget} skill points to spend on top of your career's
          starting skills{' '}
          {budget !== CREATION_SKILL_POINTS &&
            `(${CREATION_SKILL_POINTS} default ${
              budget > CREATION_SKILL_POINTS ? '+' : '−'
            } ${Math.abs(budget - CREATION_SKILL_POINTS)} from background bonuses)`}
          . Levels 1–4 cost 1 point each; level 5 and 6 cost 2 points each. No
          skill can exceed {CREATION_SKILL_MAX} during creation.
        </p>
      </header>

      <div
        className={`rounded-lg border px-3 py-2 text-sm ${
          spent === budget
            ? 'border-success-700/40 bg-success-700/10 text-success-900'
            : spent > budget
              ? 'border-danger-700/40 bg-danger-700/10 text-danger-900'
              : 'border-warning-700/40 bg-warning-700/10 text-warning-900'
        }`}
      >
        {budget - spent} of {budget} skill points remaining
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SKILLS.map((skill) => {
          const base = baseline[skill.id] ?? 0
          const current = state.skillsSpent[skill.id] ?? 0
          const bonus = bonusDeltas[skill.id] ?? 0
          const finalLevel = base + current + bonus
          return (
            <div
              key={skill.id}
              className="flex items-center gap-3 rounded-lg border border-gray-400 bg-gray-100 px-3 py-2"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-1000">
                  {skill.name}
                </div>
                <div className="text-[11px] text-gray-700">
                  base {base}
                  {bonus !== 0 && (
                    <span className="ml-1 text-accent-900">
                      · {bonus > 0 ? `+${bonus}` : bonus} bonus
                    </span>
                  )}
                </div>
              </div>
              <InlineStepper
                value={finalLevel}
                ariaLabel={skill.name}
                decrementDisabled={current <= 0}
                incrementDisabled={base + current + bonus >= CREATION_SKILL_MAX}
                onAdjust={(d) => adjust(skill.id, d)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Step 5: Final touches ----------

function FinalStep({
  state,
  setState,
}: {
  state: State
  setState: React.Dispatch<React.SetStateAction<State>>
}) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Final touches</h2>
        <p className="mt-1 text-sm text-gray-900">
          Give your character a name, age and gender. Your starting equipment
          (your career's gear list plus 1000 free credits) will be ready in the
          inventory once that panel ships — for now you'll have 1000 credits in
          the bank.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-900">Name</label>
          <Input
            type="text"
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            placeholder="Kira Voss"
            autoComplete="off"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-900">Gender</label>
          <Input
            type="text"
            value={state.gender}
            onChange={(e) =>
              setState((s) => ({ ...s, gender: e.target.value }))
            }
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-900">Age</label>
          <Input
            type="number"
            value={state.age}
            onChange={(e) => setState((s) => ({ ...s, age: e.target.value }))}
            min={0}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

// ---------- Step 6: Review ----------

function ReviewStep({
  state,
  baseline,
  bgChosen,
  resolvedBonuses,
  validationErrors,
}: {
  state: State
  baseline: Record<string, number>
  bgChosen: ChosenBonus[]
  resolvedBonuses: ResolvedBonus[]
  validationErrors: string[]
}) {
  const projection = projectResolvedBonuses(resolvedBonuses)
  const finalAttrs: CharacterAttributes = { ...state.baseAttributes }
  for (const [id, delta] of Object.entries(projection.attributeDeltas)) {
    const a = id as AttributeId
    finalAttrs[a] = finalAttrs[a] + (delta ?? 0)
  }
  const finalSkills: Record<string, number> = { ...baseline }
  for (const [id, spent] of Object.entries(state.skillsSpent)) {
    finalSkills[id] = (finalSkills[id] ?? 0) + spent
  }
  for (const [id, delta] of Object.entries(projection.skillDeltas)) {
    finalSkills[id] = (finalSkills[id] ?? 0) + delta
  }
  const baseDerived = computeAllDerivedStats(finalAttrs)
  const derived = {
    ...baseDerived,
    health: baseDerived.health + projection.derivedStatBonuses.maxHealth,
    edge: baseDerived.edge + projection.derivedStatBonuses.maxEdge,
    cyberImmunity:
      baseDerived.cyberImmunity + projection.derivedStatBonuses.cyberImmunity,
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Review</h2>
        <p className="mt-1 text-sm text-gray-900">
          Final shape of your character. Mechanised background bonuses are
          already applied below; narrative bonuses are kept verbatim in your
          notes so the table sees them. Click "Create Character" below to
          submit.
        </p>
      </header>

      {validationErrors.length > 0 && (
        <Alert className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-danger-900">
            Cannot submit — rule violations:
          </h3>
          <ul className="space-y-1 text-sm text-danger-900">
            {validationErrors.map((msg, i) => (
              <li key={i}>• {msg}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-danger-900/80">
            Step back to fix these, or use the stepper above to jump to the
            relevant step.
          </p>
        </Alert>
      )}

      <Section title="Identity">
        <p className="text-sm text-gray-1000">
          <span className="font-semibold text-white">{state.name}</span> ·{' '}
          {state.career}
        </p>
        <p className="text-xs text-gray-700">
          {state.gender || '—'} · age {state.age || '—'}
        </p>
      </Section>

      <Section title="Attributes">
        <div className="grid grid-cols-7 gap-2">
          {ATTRIBUTE_DEFINITIONS.map((a) => {
            const delta = projection.attributeDeltas[a.id] ?? 0
            return (
              <div
                key={a.id}
                className="rounded border border-gray-400 bg-gray-100 p-2 text-center"
              >
                <div className="text-[10px] uppercase text-gray-700">
                  {a.abbr}
                </div>
                <div className="text-lg font-bold text-white">
                  {finalAttrs[a.id]}
                </div>
                {delta !== 0 && (
                  <div className="text-[10px] text-accent-900">
                    {delta > 0 ? `+${delta}` : delta} bonus
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Derived stats">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Health', derived.health],
            ['Vigilance', derived.vigilance],
            ['Heft', derived.heft],
            ['Edge', derived.edge],
            ['Action Points', derived.actionPoints],
            ['Speed', derived.speed],
            ['Cyber Immunity', derived.cyberImmunity],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded border border-gray-400 bg-gray-100 px-2 py-1"
            >
              <span className="text-xs text-gray-900">{label}</span>:{' '}
              <span className="font-medium text-white">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          {SKILLS.map((s) => {
            const final = finalSkills[s.id] ?? 0
            if (final === 0) return null
            return (
              <div key={s.id} className="flex justify-between">
                <span className="text-gray-1000">{s.name}</span>
                <span className="font-medium text-white">{final}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Talents">
        {state.startingTalents.length === 0 ? (
          <p className="text-sm text-gray-700">None yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-gray-1000">
            {state.startingTalents.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Wallet">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded border border-gray-400 bg-gray-100 px-2 py-1">
            <span className="text-xs text-gray-900">Credits</span>:{' '}
            <span className="font-medium text-white">
              {1000 + projection.creditDelta}
            </span>
          </div>
          <div className="rounded border border-gray-400 bg-gray-100 px-2 py-1">
            <span className="text-xs text-gray-900">Assets</span>:{' '}
            <span className="font-medium text-white">
              {projection.assetDelta}
            </span>
          </div>
        </div>
      </Section>

      <Section title="Applied background bonuses">
        {resolvedBonuses.length === 0 ? (
          <p className="text-sm text-gray-700">None.</p>
        ) : (
          <ul className="space-y-1 text-sm text-gray-1000">
            {resolvedBonuses.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent-900">•</span>
                <ResolvedBonusLine resolved={r} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Background text record">
        {bgChosen.length === 0 ? (
          <p className="text-sm text-gray-700">None yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-1000">
            {bgChosen.map(({ table, entry }) => (
              <li key={table}>
                <span className="text-xs uppercase tracking-wide text-gray-700">
                  {BG_LABEL[table]}
                </span>{' '}
                — <span className="font-medium text-white">{entry.name}</span>
                <div className="mt-0.5 text-gray-900">{entry.bonus}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function ResolvedBonusLine({ resolved }: { resolved: ResolvedBonus }) {
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  switch (resolved.kind) {
    case 'grant-talent':
    case 'choose-talent':
      return <>Grants talent: {resolved.talentId}</>
    case 'attribute-bump':
    case 'attribute-choice':
      return (
        <>
          {ATTRIBUTE_DEFINITIONS.find((a) => a.id === resolved.attribute)
            ?.name ?? resolved.attribute}{' '}
          {fmt(resolved.by)}
        </>
      )
    case 'skill-bump':
    case 'skill-choice':
      return (
        <>
          {SKILLS.find((s) => s.id === resolved.skill)?.name ?? resolved.skill}{' '}
          {fmt(resolved.by)} level{Math.abs(resolved.by) === 1 ? '' : 's'}
        </>
      )
    case 'asset-delta':
      return <>{fmt(resolved.by)} Assets</>
    case 'credit-delta':
      return <>{fmt(resolved.by)} Credits</>
    case 'max-health-bump':
      return <>Max Health {fmt(resolved.by)}</>
    case 'max-edge-bump':
      return <>Max Edge {fmt(resolved.by)}</>
    case 'cyber-immunity-bump':
      return <>Cyber Immunity {fmt(resolved.by)}</>
    case 'skill-points-bonus':
      return <>{fmt(resolved.by)} creation skill points</>
  }
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-900">
        {title}
      </h3>
      {children}
    </section>
  )
}
