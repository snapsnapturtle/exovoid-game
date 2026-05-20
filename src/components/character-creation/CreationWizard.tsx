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
import type { CharacterAttributes, TalentEntry } from '~/lib/types/database'
import careersData from '~/data/careers.json'
import backgroundsData from '~/data/backgrounds.json'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'

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
      origin: { mode: 'roll', rolls: [], chosen: null },
      childhood: { mode: 'roll', rolls: [], chosen: null },
      adolescence: { mode: 'roll', rolls: [], chosen: null },
      lifeEvent1: { mode: 'roll', rolls: [], chosen: null },
      lifeEvent2: { mode: 'roll', rolls: [], chosen: null },
    },
    extraRollsAppliedTo: null,
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
  const skillsRemaining = CREATION_SKILL_POINTS - skillsUsed

  // Authoritative pre-submit check — same logic the server runs. The
  // step-level checks should keep this passing throughout the wizard;
  // it acts as a final guard plus a place to render rule violations.
  const validation = useMemo(() => {
    if (!state.career) return { ok: true, errors: [] }
    const careerData = careers.find((c) => c.name === state.career)
    if (!careerData) return { ok: true, errors: [] }
    const finalSkills: Record<string, number> = { ...skillBaseline }
    for (const [id, spent] of Object.entries(state.skillsSpent)) {
      finalSkills[id] = (finalSkills[id] ?? 0) + spent
    }
    const talentEntries: TalentEntry[] = state.startingTalents.map((name) => {
      const ref = careerData.talents.find((t) => t.talent === name)
      return makeTalentEntry(name, state.career!, ref?.tier ?? 0, 0)
    })
    return validateCreation(
      {
        careerName: state.career,
        attributes: state.baseAttributes,
        finalSkills,
        talents: talentEntries,
      },
      careers,
    )
  }, [
    state.career,
    state.baseAttributes,
    state.skillsSpent,
    state.startingTalents,
    skillBaseline,
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
        return BG_KEYS.every((k) => state.bg[k].chosen != null)
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
      // Skills already include the career baseline + the player's spent points;
      // background bonuses are *not* auto-applied — they're surfaced in
      // background_notes as a checklist for the player/GM.
      const finalSkills: Record<string, number> = { ...skillBaseline }
      for (const [id, spent] of Object.entries(state.skillsSpent)) {
        finalSkills[id] = (finalSkills[id] ?? 0) + spent
      }

      const noteLines = [
        'Background bonuses to apply manually:',
        ...bgChosen.map(
          ({ table, entry }) =>
            `  • ${BG_LABEL[table]} — ${entry.name}: ${entry.bonus}`,
        ),
      ].join('\n')

      const careerName = state.career ?? ''
      const careerData = careers.find((c) => c.name === careerName)
      const talentEntries: TalentEntry[] = state.startingTalents.map((name) => {
        const ref = careerData?.talents.find((t) => t.talent === name)
        return makeTalentEntry(name, careerName, ref?.tier ?? 0, 0)
      })

      const character = await createCharacter({
        data: {
          gameId,
          name: state.name.trim(),
          career: careerName,
          gender: state.gender.trim(),
          age: state.age.trim() ? parseInt(state.age.trim(), 10) : null,
          background_notes: noteLines,
          attributes: state.baseAttributes,
          skills: finalSkills,
          talents: talentEntries,
          credits: 1000,
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
          />
        )}
        {state.step === 4 && <FinalStep state={state} setState={setState} />}
        {state.step === 5 && (
          <ReviewStep
            state={state}
            baseline={skillBaseline}
            bgChosen={bgChosen}
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
                  <button
                    onClick={() => adjust(a.id, -1)}
                    disabled={value <= 0}
                    aria-label={`Decrease ${a.name}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    onClick={() => adjust(a.id, +1)}
                    disabled={value >= cap || pointsRemaining <= 0}
                    aria-label={`Increase ${a.name}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    +
                  </button>
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
        [key]: { mode: 'roll', rolls: uniqueRolls(2, max), chosen: null },
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
          },
        },
      }
    })
  }

  function setManual(key: BgKey) {
    setState((s) => ({
      ...s,
      bg: { ...s.bg, [key]: { mode: 'manual', rolls: [], chosen: null } },
      extraRollsAppliedTo:
        s.extraRollsAppliedTo === key ? null : s.extraRollsAppliedTo,
    }))
  }

  function chooseEntry(key: BgKey, id: number) {
    setState((s) => ({
      ...s,
      bg: { ...s.bg, [key]: { ...s.bg[key], chosen: id } },
    }))
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Background</h2>
        <p className="mt-1 text-sm text-gray-900">
          Roll twice on each table and choose one. Once across this step, you
          may roll two extra dice on a single table for more options. Bonuses we
          can mechanize (attribute / skill / talent grants) auto-apply on
          submission; the rest is captured in your character notes.
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
        />
      ))}
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
}: {
  bgKey: BgKey
  state: State
  onRoll: () => void
  onRollExtra: () => void
  onSetManual: () => void
  onChoose: (id: number) => void
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
          <select
            value={pick.chosen ?? ''}
            onChange={(e) => onChoose(parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-gray-400 bg-background-200 px-3 py-2 text-sm text-white focus:border-accent-900 focus:outline-none"
          >
            <option value="">— pick an entry —</option>
            {table.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.id}. {entry.name}
              </option>
            ))}
          </select>
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
    </section>
  )
}

// ---------- Step 4: Skills ----------

function SkillsStep({
  state,
  setState,
  baseline,
  spent,
}: {
  state: State
  setState: React.Dispatch<React.SetStateAction<State>>
  baseline: Record<string, number>
  spent: number
}) {
  function adjust(id: string, delta: number) {
    setState((s) => {
      const base = baseline[id] ?? 0
      const current = s.skillsSpent[id] ?? 0
      const final = base + current
      const newFinal = final + delta
      if (newFinal < base) return s
      if (newFinal > CREATION_SKILL_MAX) return s
      // Verify points budget
      const newSpent = current + delta
      const tentative = { ...s.skillsSpent, [id]: newSpent }
      let total = 0
      for (const sk of SKILLS) {
        const b = baseline[sk.id] ?? 0
        const c = tentative[sk.id] ?? 0
        total += pointsForSkillLevel(b + c) - pointsForSkillLevel(b)
      }
      if (total > CREATION_SKILL_POINTS) return s
      return { ...s, skillsSpent: tentative }
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Further training</h2>
        <p className="mt-1 text-sm text-gray-900">
          You have {CREATION_SKILL_POINTS} skill points to spend on top of your
          career's starting skills. Levels 1–4 cost 1 point each; level 5 and 6
          cost 2 points each. No skill can exceed {CREATION_SKILL_MAX} during
          creation. Background skill bonuses are tracked separately and listed
          on the review step for you to apply by hand.
        </p>
      </header>

      <div
        className={`rounded-lg border px-3 py-2 text-sm ${
          spent === CREATION_SKILL_POINTS
            ? 'border-success-700/40 bg-success-700/10 text-success-900'
            : spent > CREATION_SKILL_POINTS
              ? 'border-danger-700/40 bg-danger-700/10 text-danger-900'
              : 'border-warning-700/40 bg-warning-700/10 text-warning-900'
        }`}
      >
        {CREATION_SKILL_POINTS - spent} of {CREATION_SKILL_POINTS} skill points
        remaining
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SKILLS.map((skill) => {
          const base = baseline[skill.id] ?? 0
          const current = state.skillsSpent[skill.id] ?? 0
          const finalLevel = base + current
          return (
            <div
              key={skill.id}
              className="flex items-center gap-3 rounded-lg border border-gray-400 bg-gray-100 px-3 py-2"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-1000">
                  {skill.name}
                </div>
                <div className="text-[11px] text-gray-700">base {base}</div>
              </div>
              <button
                onClick={() => adjust(skill.id, -1)}
                disabled={current <= 0}
                aria-label={`Decrease ${skill.name}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-[2ch] text-center text-sm font-medium text-white">
                {finalLevel}
              </span>
              <button
                onClick={() => adjust(skill.id, +1)}
                disabled={base + current >= CREATION_SKILL_MAX}
                aria-label={`Increase ${skill.name}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-400 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
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
          <input
            type="text"
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            placeholder="Kira Voss"
            className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-900">Gender</label>
          <input
            type="text"
            value={state.gender}
            onChange={(e) =>
              setState((s) => ({ ...s, gender: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-900">Age</label>
          <input
            type="number"
            value={state.age}
            onChange={(e) => setState((s) => ({ ...s, age: e.target.value }))}
            min={0}
            className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
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
  validationErrors,
}: {
  state: State
  baseline: Record<string, number>
  bgChosen: ChosenBonus[]
  validationErrors: string[]
}) {
  const finalSkills: Record<string, number> = { ...baseline }
  for (const [id, spent] of Object.entries(state.skillsSpent)) {
    finalSkills[id] = (finalSkills[id] ?? 0) + spent
  }
  const derived = computeAllDerivedStats(state.baseAttributes)

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white">Review</h2>
        <p className="mt-1 text-sm text-gray-900">
          Final shape of your character. Background bonuses are listed at the
          bottom — apply them by hand on the character sheet after creation.
          Click "Create Character" below to submit.
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
          {ATTRIBUTE_DEFINITIONS.map((a) => (
            <div
              key={a.id}
              className="rounded border border-gray-400 bg-gray-100 p-2 text-center"
            >
              <div className="text-[10px] uppercase text-gray-700">
                {a.abbr}
              </div>
              <div className="text-lg font-bold text-white">
                {state.baseAttributes[a.id]}
              </div>
            </div>
          ))}
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

      <Section title="Background bonuses (apply manually)">
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
