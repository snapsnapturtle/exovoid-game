import { describe, expect, it } from 'vitest'
import backgroundsData from './backgrounds.json'
import talentsData from './talents.json'
import careersData from './careers.json'
import { ATTRIBUTE_DEFINITIONS } from '~/lib/game-logic/attributes'
import { SKILLS } from '~/lib/game-logic/skills'
import type {
  BackgroundBonus,
  LeafBonus,
} from '~/lib/game-logic/background-bonuses'

interface Entry {
  id: number
  name: string
  description: string
  bonus: string
  bonuses?: BackgroundBonus[]
}

const TABLES = ['origin', 'childhood', 'adolescence', 'lifeEvents'] as const

const allEntries: { table: string; entry: Entry }[] = []
for (const t of TABLES) {
  for (const entry of (backgroundsData as Record<string, Entry[]>)[t]) {
    allEntries.push({ table: t, entry })
  }
}

const TALENT_NAMES = new Set(
  (talentsData as { name: string }[]).map((t) => t.name),
)
const CAREER_NAMES = new Set(
  (careersData as { name: string }[]).map((c) => c.name),
)
const ATTRIBUTE_IDS = new Set(ATTRIBUTE_DEFINITIONS.map((a) => a.id))
const SKILL_IDS = new Set(SKILLS.map((s) => s.id))

function validateLeaf(leaf: LeafBonus): string | null {
  switch (leaf.kind) {
    case 'grant-talent':
      if (!TALENT_NAMES.has(leaf.talentId))
        return `grant-talent references unknown talent "${leaf.talentId}"`
      return null
    case 'choose-talent':
      if (leaf.from.careers) {
        for (const c of leaf.from.careers)
          if (!CAREER_NAMES.has(c))
            return `choose-talent references unknown career "${c}"`
      }
      return null
    case 'attribute-bump':
    case 'attribute-choice':
      if ('attribute' in leaf && !ATTRIBUTE_IDS.has(leaf.attribute))
        return `${leaf.kind} references unknown attribute "${leaf.attribute}"`
      if ('from' in leaf && leaf.from)
        for (const a of leaf.from)
          if (!ATTRIBUTE_IDS.has(a))
            return `${leaf.kind} references unknown attribute "${a}"`
      return null
    case 'skill-bump':
    case 'skill-choice':
      if ('skill' in leaf && !SKILL_IDS.has(leaf.skill))
        return `${leaf.kind} references unknown skill "${leaf.skill}"`
      if ('from' in leaf && leaf.from)
        for (const s of leaf.from)
          if (!SKILL_IDS.has(s))
            return `${leaf.kind} references unknown skill "${s}"`
      return null
    default:
      return null
  }
}

describe('backgrounds.json', () => {
  it('every entry has the expected baseline fields', () => {
    for (const { table, entry } of allEntries) {
      expect(entry.id, `${table}#${entry.id}`).toBeTypeOf('number')
      expect(entry.name).toBeTypeOf('string')
      expect(entry.description).toBeTypeOf('string')
      expect(entry.bonus).toBeTypeOf('string')
    }
  })

  it('every bonus is a known kind and references valid catalog data', () => {
    const errs: string[] = []
    for (const { table, entry } of allEntries) {
      if (!entry.bonuses) continue
      for (const b of entry.bonuses) {
        if (b.kind === 'one-of') {
          for (const opt of b.options) {
            if ((opt as BackgroundBonus).kind === 'one-of') {
              errs.push(`${table}#${entry.id}: nested one-of`)
              continue
            }
            const e = validateLeaf(opt)
            if (e) errs.push(`${table}#${entry.id}: ${e}`)
          }
          continue
        }
        const e = validateLeaf(b)
        if (e) errs.push(`${table}#${entry.id}: ${e}`)
      }
    }
    expect(errs).toEqual([])
  })

  it('mechanises a meaningful share of entries', () => {
    const annotated = allEntries.filter((x) => x.entry.bonuses?.length).length
    expect(annotated).toBeGreaterThanOrEqual(35)
  })
})
