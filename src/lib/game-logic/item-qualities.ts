import qualitiesData from '~/data/item-qualities.json'

export type QualityType = 'Item Quality' | 'Trigger Option'

export interface ItemQuality {
  type: QualityType
  name: string
  effect: string
}

const QUALITY_TYPES: QualityType[] = ['Item Quality', 'Trigger Option']

export const ALL_QUALITIES = qualitiesData as ItemQuality[]

// Keyed by `${type}:${name}`, not name alone — the catalog has distinct
// "Injuring" entries for both types, and keying by name would let one shadow
// the other (last-write-wins).
const BY_TYPE_AND_NAME = new Map(
  ALL_QUALITIES.map((q) => [`${q.type}:${q.name}`, q]),
)

// The weapons catalog refers to the firing-mode qualities by their colloquial
// short names ("Burst (5)", "Full Auto (18)"), but the rulebook entry is filed
// under "Firing Mode: …". Map the short form to the catalog name so the badge
// tooltip resolves. (The bracketed number is the ammo cost per the rulebook,
// not a level — it's just displayed verbatim.)
const NAME_ALIASES: Record<string, string> = {
  Burst: 'Firing Mode: Burst',
  'Full Auto': 'Firing Mode: Full Auto',
}

/**
 * Resolve a quality by name. When `type` is given the matching variant is
 * preferred; if no entry of that type exists we fall back to the other type so
 * callers that don't know the exact type still resolve a name.
 */
export function lookupQuality(
  name: string,
  type?: QualityType,
): ItemQuality | undefined {
  const canonical = NAME_ALIASES[name] ?? name
  const order = type
    ? [type, ...QUALITY_TYPES.filter((t) => t !== type)]
    : QUALITY_TYPES
  for (const t of order) {
    const match = BY_TYPE_AND_NAME.get(`${t}:${canonical}`)
    if (match) return match
  }
  return undefined
}
