import itemsData from '~/data/items.json'
import type { InventoryItem } from '~/lib/types/domain'

export interface ItemData {
  category: string
  item: string
  name: string
  description: string
  size: number
  cost: number
  rarity: number
}

const ALL_ITEMS = itemsData as ItemData[]
const BY_NAME = new Map(ALL_ITEMS.map((i) => [i.name, i]))

export function allItems(): readonly ItemData[] {
  return ALL_ITEMS
}

export function lookupItem(name: string): ItemData | undefined {
  return BY_NAME.get(name)
}

/** Group catalog items by `category` in CSV order for the picker UI. */
export function itemsByCategory(): { category: string; items: ItemData[] }[] {
  const groups: { category: string; items: ItemData[] }[] = []
  const indexByCategory = new Map<string, number>()
  for (const it of ALL_ITEMS) {
    let idx = indexByCategory.get(it.category)
    if (idx === undefined) {
      idx = groups.length
      indexByCategory.set(it.category, idx)
      groups.push({ category: it.category, items: [] })
    }
    groups[idx].items.push(it)
  }
  return groups
}

/** Group inventory entries by their `location` field, preserving first-seen order. */
export function inventoryByLocation(
  entries: InventoryItem[],
): { location: string; items: InventoryItem[] }[] {
  const groups: { location: string; items: InventoryItem[] }[] = []
  const indexByLocation = new Map<string, number>()
  for (const entry of entries) {
    const loc = entry.location?.trim() || 'Unsorted'
    let idx = indexByLocation.get(loc)
    if (idx === undefined) {
      idx = groups.length
      indexByLocation.set(loc, idx)
      groups.push({ location: loc, items: [] })
    }
    groups[idx].items.push(entry)
  }
  return groups
}
