import cyberwareData from '~/data/cyberware.json'
import type { Character, CyberwareEntry } from '~/lib/types/database'

export interface CyberwareData {
  category: string
  name: string
  tier: string
  description: string
  cyberImmunityCost: number
  cost: number
  rarity: number
}

const ALL_CYBERWARE = cyberwareData as CyberwareData[]
const BY_NAME = new Map(ALL_CYBERWARE.map((c) => [c.name, c]))

export function allCyberware(): readonly CyberwareData[] {
  return ALL_CYBERWARE
}

export function lookupCyberware(name: string): CyberwareData | undefined {
  return BY_NAME.get(name)
}

export function occupationUsed(entries: CyberwareEntry[]): number {
  return entries.reduce(
    (sum, e) => sum + (BY_NAME.get(e.name)?.cyberImmunityCost ?? 0),
    0,
  )
}

export interface InstallCheck {
  ok: boolean
  /** Blocking reason — install cannot proceed. */
  reason?: string
  /**
   * Non-blocking warning — install proceeds but triggers the cybernetic
   * overload state (rulebook §"Exceeding Cyber Immunity"). Excess points
   * must be allocated to the Cyber Malfunction Table; that allocation UI
   * is not yet implemented.
   */
  warning?: string
  /** Name of the existing variant in the same category that this install replaces. */
  replaces?: string
}

export function canInstall(
  character: Character,
  cyberwareName: string,
  capacity: number,
): InstallCheck {
  const meta = BY_NAME.get(cyberwareName)
  if (!meta) return { ok: false, reason: 'Unknown cyberware' }
  if (character.cyberware.some((c) => c.name === cyberwareName)) {
    return { ok: false, reason: 'Already installed' }
  }
  const existing = character.cyberware.find((c) => c.category === meta.category)
  const replacedCost = existing
    ? (BY_NAME.get(existing.name)?.cyberImmunityCost ?? 0)
    : 0
  const usedAfterReplace = occupationUsed(character.cyberware) - replacedCost
  const totalAfterInstall = usedAfterReplace + meta.cyberImmunityCost
  if (totalAfterInstall > capacity) {
    const excess = totalAfterInstall - capacity
    return {
      ok: true,
      replaces: existing?.name,
      warning: `Exceeds Cyberimmunity by ${excess} — triggers cybernetic overload.`,
    }
  }
  return { ok: true, replaces: existing?.name }
}

export function makeCyberwareEntry(
  name: string,
  level: number,
): CyberwareEntry | null {
  const meta = BY_NAME.get(name)
  if (!meta) return null
  return {
    name,
    category: meta.category,
    tier: meta.tier,
    installedAt: level,
  }
}

/** Group all cyberware variants by category, preserving CSV order. */
export function groupByCategory(): {
  category: string
  variants: CyberwareData[]
}[] {
  const groups: { category: string; variants: CyberwareData[] }[] = []
  const indexByCategory = new Map<string, number>()
  for (const c of ALL_CYBERWARE) {
    let idx = indexByCategory.get(c.category)
    if (idx === undefined) {
      idx = groups.length
      indexByCategory.set(c.category, idx)
      groups.push({ category: c.category, variants: [] })
    }
    groups[idx].variants.push(c)
  }
  return groups
}
