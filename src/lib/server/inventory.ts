import { createServerFn } from '@tanstack/react-start'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import type { GameState, InventoryItem } from '~/lib/types/database'
import { lookupItem } from '~/lib/game-logic/items'

type Owner =
  | { type: 'character'; characterId: string }
  | { type: 'game'; gameId: string }

type CurrencyKind = 'credits' | 'assets'

// ---------------------------------------------------------------------------
// Internal helpers (one set per owner type, hidden behind a discriminated
// dispatcher so the public fns stay flat).

async function readInventory(
  supabase: SupabaseClient,
  owner: Owner,
): Promise<InventoryItem[]> {
  if (owner.type === 'character') {
    const { data, error } = await supabase
      .from('characters')
      .select('inventory')
      .eq('id', owner.characterId)
      .single()
    if (error || !data) throw new Error('Character not found')
    return (data.inventory as InventoryItem[]) ?? []
  }
  const { data, error } = await supabase
    .from('game_state')
    .select('inventory')
    .eq('game_id', owner.gameId)
    .single()
  if (error || !data) throw new Error('Game state not found')
  return (data.inventory as InventoryItem[]) ?? []
}

async function writeInventory(
  supabase: SupabaseClient,
  owner: Owner,
  inventory: InventoryItem[],
): Promise<void> {
  if (owner.type === 'character') {
    const { error } = await supabase
      .from('characters')
      .update({ inventory } as never)
      .eq('id', owner.characterId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('game_state')
      .update({ inventory } as never)
      .eq('game_id', owner.gameId)
    if (error) throw new Error(error.message)
  }
}

function buildEntry(input: {
  source: 'catalog' | 'custom'
  name: string
  quantity: number
  location?: string
  description?: string
}): InventoryItem {
  if (input.quantity < 1) throw new Error('Quantity must be at least 1')
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')
  if (input.source === 'catalog' && !lookupItem(name)) {
    throw new Error(`Unknown catalog item: ${name}`)
  }
  const location = input.location?.trim() || undefined
  const description = input.description?.trim() || undefined
  return {
    id: crypto.randomUUID(),
    source: input.source,
    name,
    quantity: input.quantity,
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
  }
}

// ---------------------------------------------------------------------------
// Inventory operations.

export const addInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      owner: Owner
      source: 'catalog' | 'custom'
      name: string
      quantity: number
      location?: string
      description?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const entry = buildEntry(data)
    const current = await readInventory(supabase, data.owner)
    await writeInventory(supabase, data.owner, [...current, entry])
    return entry
  })

export const updateInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      owner: Owner
      itemId: string
      updates: {
        quantity?: number
        location?: string
        description?: string
        name?: string
      }
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const current = await readInventory(supabase, data.owner)
    const idx = current.findIndex((e) => e.id === data.itemId)
    if (idx < 0) throw new Error('Item not found')

    const existing = current[idx]
    const next: InventoryItem = { ...existing }
    if (data.updates.quantity !== undefined) {
      if (data.updates.quantity < 1) throw new Error('Quantity must be at least 1')
      next.quantity = data.updates.quantity
    }
    if (data.updates.location !== undefined) {
      const trimmed = data.updates.location.trim()
      if (trimmed) next.location = trimmed
      else delete next.location
    }
    if (data.updates.description !== undefined) {
      if (existing.source !== 'custom') {
        throw new Error('Cannot edit description on a catalog item')
      }
      const trimmed = data.updates.description.trim()
      if (trimmed) next.description = trimmed
      else delete next.description
    }
    if (data.updates.name !== undefined) {
      if (existing.source !== 'custom') {
        throw new Error('Cannot rename a catalog item')
      }
      const trimmed = data.updates.name.trim()
      if (!trimmed) throw new Error('Name cannot be empty')
      next.name = trimmed
    }

    const arr = current.slice()
    arr[idx] = next
    await writeInventory(supabase, data.owner, arr)
    return next
  })

export const removeInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator((d: { owner: Owner; itemId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const current = await readInventory(supabase, data.owner)
    const next = current.filter((e) => e.id !== data.itemId)
    if (next.length === current.length) throw new Error('Item not found')
    await writeInventory(supabase, data.owner, next)
    return { removed: data.itemId }
  })

export const transferInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      from: Owner
      to: Owner
      itemId: string
      /** Partial transfer; omit to move the entire stack. */
      quantity?: number
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const fromInventory = await readInventory(supabase, data.from)
    const idx = fromInventory.findIndex((e) => e.id === data.itemId)
    if (idx < 0) throw new Error('Item not found in source inventory')
    const source = fromInventory[idx]
    const moveQty = data.quantity ?? source.quantity
    if (moveQty < 1) throw new Error('Quantity must be at least 1')
    if (moveQty > source.quantity) throw new Error('Not enough quantity to transfer')

    const partial = moveQty < source.quantity
    const updatedFrom = partial
      ? fromInventory.map((e, i) =>
          i === idx ? { ...e, quantity: e.quantity - moveQty } : e,
        )
      : fromInventory.filter((_, i) => i !== idx)

    const moved: InventoryItem = partial
      ? { ...source, id: crypto.randomUUID(), quantity: moveQty }
      : source

    await writeInventory(supabase, data.from, updatedFrom)
    // If both ends are the same owner this would double-write; the route UI
    // never offers that, so we don't guard against it.
    const toInventory = await readInventory(supabase, data.to)
    await writeInventory(supabase, data.to, [...toInventory, moved])

    return { moved }
  })

// ---------------------------------------------------------------------------
// Currency operations.

export const setCurrency = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { owner: Owner; credits?: number; assets?: number }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const updates: { credits?: number; assets?: number } = {}
    if (data.credits !== undefined) {
      if (data.credits < 0) throw new Error('Credits cannot be negative')
      updates.credits = data.credits
    }
    if (data.assets !== undefined) {
      if (data.assets < 0) throw new Error('Assets cannot be negative')
      updates.assets = data.assets
    }
    if (Object.keys(updates).length === 0) {
      throw new Error('Nothing to update')
    }

    if (data.owner.type === 'character') {
      const { error } = await supabase
        .from('characters')
        .update(updates as never)
        .eq('id', data.owner.characterId)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('game_state')
        .update(updates as never)
        .eq('game_id', data.owner.gameId)
      if (error) throw new Error(error.message)
    }
    return updates
  })

export const transferCurrency = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      from: Owner
      to: Owner
      kind: CurrencyKind
      amount: number
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    if (data.amount < 1) throw new Error('Amount must be at least 1')

    const fromBalance = await readCurrency(supabase, data.from, data.kind)
    if (fromBalance < data.amount) {
      throw new Error('Not enough ' + data.kind + ' to transfer')
    }
    const toBalance = await readCurrency(supabase, data.to, data.kind)

    await writeCurrency(supabase, data.from, data.kind, fromBalance - data.amount)
    await writeCurrency(supabase, data.to, data.kind, toBalance + data.amount)
    return { moved: data.amount }
  })

async function readCurrency(
  supabase: SupabaseClient,
  owner: Owner,
  kind: CurrencyKind,
): Promise<number> {
  if (owner.type === 'character') {
    const { data, error } = await supabase
      .from('characters')
      .select(kind)
      .eq('id', owner.characterId)
      .single()
    if (error || !data) throw new Error('Character not found')
    return (data as Record<string, number>)[kind]
  }
  const { data, error } = await supabase
    .from('game_state')
    .select(kind)
    .eq('game_id', owner.gameId)
    .single()
  if (error || !data) throw new Error('Game state not found')
  return (data as Record<string, number>)[kind]
}

async function writeCurrency(
  supabase: SupabaseClient,
  owner: Owner,
  kind: CurrencyKind,
  value: number,
): Promise<void> {
  if (owner.type === 'character') {
    const { error } = await supabase
      .from('characters')
      .update({ [kind]: value } as never)
      .eq('id', owner.characterId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('game_state')
      .update({ [kind]: value } as never)
      .eq('game_id', owner.gameId)
    if (error) throw new Error(error.message)
  }
}

// ---------------------------------------------------------------------------
// Loader.

export const loadGameState = createServerFn({ method: 'GET' })
  .inputValidator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: row, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('game_id', data.gameId)
      .single()
    if (error || !row) throw new Error('Game state not found')
    return row as unknown as GameState
  })
