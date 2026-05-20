#!/usr/bin/env node
// One-shot conversion of the rules CSVs (rules/) into the JSON data files
// the app reads at runtime (src/data/). Run via:
//
//   node scripts/import-rules.mjs
//
// The CSVs come from Google Sheets exports; they use standard RFC 4180
// quoting with multi-line cells. The parser below handles those.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const RULES = join(ROOT, 'rules')
const OUT = join(ROOT, 'src', 'data')

mkdirSync(OUT, { recursive: true })

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let fieldStarted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"' && !fieldStarted) {
      inQuotes = true
      fieldStarted = true
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      fieldStarted = false
      continue
    }
    if (ch === '\r') continue
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      fieldStarted = false
      continue
    }
    field += ch
    fieldStarted = true
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function readTable(name) {
  const text = readFileSync(join(RULES, name), 'utf8')
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const headers = rows[0].map((h) => h.trim())
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj = {}
      headers.forEach((h, i) => {
        obj[h] = (r[i] ?? '').trim()
      })
      return obj
    })
}

function writeJson(name, data) {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n')
  console.log(
    `  wrote src/data/${name} (${Array.isArray(data) ? data.length + ' rows' : 'object'})`,
  )
}

// Preserve hand-annotated `effects` arrays across re-imports. The CSVs only
// carry the descriptive text — passive stat modifiers are typed and added by
// hand to the JSON. Without this, re-running the importer would wipe them.
function preserveEffects(filename, items) {
  const path = join(OUT, filename)
  if (!existsSync(path)) return items
  const existing = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(existing)) return items
  const effectsByName = new Map()
  for (const e of existing) {
    if (e?.name && Array.isArray(e.effects) && e.effects.length > 0) {
      effectsByName.set(e.name, e.effects)
    }
  }
  return items.map((item) => {
    const eff = effectsByName.get(item.name)
    return eff ? { ...item, effects: eff } : item
  })
}

// --- Talents ----------------------------------------------------------------
console.log('Talents...')
const talentRows = readTable('Exovoid Content - Talents.csv')
const talents = preserveEffects(
  'talents.json',
  talentRows.map((r) => ({
    name: r.talent,
    description: r.description,
  })),
)
writeJson('talents.json', talents)

// --- Careers + per-career talent tiers --------------------------------------
console.log('Careers...')
const overviewRows = readTable('Exovoid Content - Career Overview.csv')
const careerTalentRows = readTable('Exovoid Content - Careers.csv')

// Group talent → tier by career
const careerTalents = new Map()
for (const r of careerTalentRows) {
  if (!r.career || !r.talent) continue
  const tier = parseInt(r.Tier ?? r.tier, 10)
  if (Number.isNaN(tier)) continue
  if (!careerTalents.has(r.career)) careerTalents.set(r.career, [])
  careerTalents.get(r.career).push({ talent: r.talent, tier })
}

function parseStartingSkills(raw) {
  // Each line is "SkillName: N"
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?):\s*(\d+)\s*$/)
      if (!m) return { name: line, level: 0 }
      return { name: m[1].trim(), level: parseInt(m[2], 10) }
    })
}

function parseStartingEquipment(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

const careers = overviewRows
  .filter((r) => r.career && r.career !== '')
  .map((r) => ({
    name: r.career,
    description: r.description ?? '',
    startingSkills: parseStartingSkills(r.startingSkills ?? ''),
    startingEquipment: parseStartingEquipment(r.startingEquipment ?? ''),
    talents: (careerTalents.get(r.career) ?? [])
      .slice()
      .sort((a, b) => a.tier - b.tier || a.talent.localeCompare(b.talent)),
  }))
writeJson('careers.json', careers)

// --- Background tables ------------------------------------------------------
function readBackground(name, dieKey) {
  const rows = readTable(name)
  return rows
    .filter((r) => (r[dieKey] ?? '').trim() !== '')
    .map((r) => ({
      id: parseInt(r[dieKey], 10),
      name: r[Object.keys(r)[1]],
      description: r.description ?? '',
      bonus: r.bonus ?? '',
    }))
    .sort((a, b) => a.id - b.id)
}

console.log('Backgrounds...')
const backgrounds = {
  origin: readBackground('Exovoid Content - Origin.csv', '1d10'),
  childhood: readBackground('Exovoid Content - Childhood.csv', '1d10'),
  adolescence: readBackground('Exovoid Content - Adolescence.csv', '1d10'),
  lifeEvents: readBackground('Exovoid Content - Life Events.csv', '1d20'),
}
writeJson('backgrounds.json', backgrounds)

// --- Cyberware --------------------------------------------------------------
// The `cyberware` column holds the category and only appears on the first row
// of each category; subsequent variants leave it blank. Forward-fill.
console.log('Cyberware...')
const cyberwareRows = readTable('Exovoid Content - Cyberware.csv')
let currentCyberwareCategory = ''
const cyberware = preserveEffects(
  'cyberware.json',
  cyberwareRows.map((r) => {
    if (r.cyberware) currentCyberwareCategory = r.cyberware
    return {
      category: currentCyberwareCategory,
      name: r.cyberwareName,
      tier: r.tier,
      description: r.description,
      cyberImmunityCost: parseInt(r.cyberImmunityCost, 10),
      cost: parseInt(r.cost, 10),
      rarity: parseInt(r.rarity, 10),
    }
  }),
)
writeJson('cyberware.json', cyberware)

// --- Items ------------------------------------------------------------------
// Fully populated CSV (no forward-fill needed). Each row is a complete entry
// with category / item subcategory / variant name / description / size / cost
// / rarity. Used by the Inventory panel to pick from the catalog.
console.log('Items...')
const itemRows = readTable('Exovoid Content - Items.csv')
const items = itemRows.map((r) => ({
  category: r.category,
  item: r.item,
  name: r.name,
  description: r.description,
  size: parseInt(r.size, 10),
  cost: parseInt(r.cost, 10),
  rarity: parseInt(r.rarity, 10),
}))
writeJson('items.json', items)

// --- Weapons ----------------------------------------------------------------
// Each CSV row is a complete weapon: `weapon` is the canonical identifier and
// `weaponName` is just an illustrative/flavor name (used as the default
// display name when added to a character's inventory). Stats numerical
// columns can be "-" (melee/throwing have no magazine/reload/maxRange) or
// "Free!" (Unarmed has no cost) — parsed nullably.
console.log('Weapons...')
const weaponRows = readTable('Exovoid Content - Weapons.csv')

function nullableInt(raw) {
  if (raw === '' || raw === '-' || raw == null) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

function parseQualityList(raw) {
  if (!raw || raw.trim() === '') return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const weapons = weaponRows.map((r) => ({
  type: r.weaponType,
  weapon: r.weapon,
  illustrativeName: r.weaponName,
  hands: parseInt(r.hands, 10),
  magazine: nullableInt(r.magazine),
  reloadAP: nullableInt(r.reloadAP),
  attackAP: parseInt(r.attackAP, 10),
  damage: parseInt(r.damage, 10),
  damageType: r.damageType,
  optimalRange: r.optimalRange,
  maxRange: nullableInt(r.maxRange),
  qualities: parseQualityList(r.qualities),
  triggerOptions: parseQualityList(r.triggerOptions),
  specialRules: r.specialRules,
  modLimit: parseInt(r.modLimit, 10),
  cost: nullableInt(r.cost),
  roundCost: nullableInt(r.roundCost),
  rarity: nullableInt(r.rarity),
}))
writeJson('weapons.json', weapons)

// --- Armors -----------------------------------------------------------------
// Catalog of wearable armor. `armorType` is the canonical identifier; the
// `armorName` is a rulebook-illustrative variant used as the default display
// name when added to inventory. `durability` can be "-" for very light armor
// that doesn't track durability. `qualities` is a comma-separated list;
// `moddingOptions` is a multi-line list of mod types this armor can accept
// (mods land in 3c).
console.log('Armors...')
const armorRows = readTable('Exovoid Content - Armors.csv')
const armors = armorRows.map((r) => ({
  type: r.armorType,
  illustrativeName: r.armorName,
  durability: nullableInt(r.durability),
  primarySoak: parseInt(r.primarySoak, 10),
  secondarySoak: parseInt(r.secondarySoak, 10),
  qualities: parseQualityList(r.qualities),
  modLimit: parseInt(r.modLimit, 10),
  moddingOptions: (r.moddingOptions ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s !== '-'),
  specialRules: r.specialRules,
  cost: nullableInt(r.cost),
  rarity: nullableInt(r.rarity),
}))
writeJson('armors.json', armors)

// --- Item Qualities + Trigger Options ---------------------------------------
// Lookup table for tooltip text on weapon qualities like "Concealed (1)" and
// trigger options like "Penetrating (2)". The CSV stores the base name (e.g.
// "Concealed") with the rulebook effect description; the (N) value is just a
// magnitude annotation parsed off the name at usage time.
console.log('Item Qualities...')
const qualityRows = readTable('Exovoid Content - Item Qualities.csv')
const qualities = qualityRows
  .filter((r) => r.name && r.name.trim() !== '')
  .map((r) => ({
    type: r.type,
    name: r.name,
    effect: r.effect,
  }))
writeJson('item-qualities.json', qualities)

// --- Cyber Malfunction Table ------------------------------------------------
// Rulebook §"Exceeding Cyber Immunity": when over capacity, the character
// must allocate excess points across this table (rolls 2-40). Named rows
// start an outcome's range; blank rows below them inherit that outcome
// (forward-fill). Slot 3 is still Critical Shutdown, slot 30 is still
// Corrupted Data, etc. All 39 rolls are legal allocation slots.
console.log('Cyber Malfunction Table...')
const malfunctionRows = readTable(
  'Exovoid Content - Cyberware Malfunction Table.csv',
)
let currentMalfunctionOutcome = ''
let currentMalfunctionDescription = ''
let currentMalfunctionRepair = ''
const malfunctions = malfunctionRows
  .filter((r) => r['2d20roll'] && r['2d20roll'].trim() !== '')
  .map((r) => {
    if (r.outcome && r.outcome.trim() !== '') {
      currentMalfunctionOutcome = r.outcome
      currentMalfunctionDescription = r.outcomeDescription
      currentMalfunctionRepair = r.repairInfo
    }
    return {
      roll: parseInt(r['2d20roll'], 10),
      outcome: currentMalfunctionOutcome,
      description: currentMalfunctionDescription,
      repair: currentMalfunctionRepair,
    }
  })
writeJson('cyberware-malfunctions.json', malfunctions)

console.log('done.')
