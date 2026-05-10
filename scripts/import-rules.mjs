#!/usr/bin/env node
// One-shot conversion of the rules CSVs (rules/) into the JSON data files
// the app reads at runtime (src/data/). Run via:
//
//   node scripts/import-rules.mjs
//
// The CSVs come from Google Sheets exports; they use standard RFC 4180
// quoting with multi-line cells. The parser below handles those.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
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
  console.log(`  wrote src/data/${name} (${Array.isArray(data) ? data.length + ' rows' : 'object'})`)
}

// --- Talents ----------------------------------------------------------------
console.log('Talents...')
const talentRows = readTable('Exovoid Content - Talents.csv')
const talents = talentRows.map((r) => ({
  name: r.talent,
  description: r.description,
}))
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
    talents: (careerTalents.get(r.career) ?? []).slice().sort((a, b) =>
      a.tier - b.tier || a.talent.localeCompare(b.talent),
    ),
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

console.log('done.')
