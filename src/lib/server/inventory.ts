import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authMiddleware } from '~/lib/server/middleware'
import { ownerSchema, uuidSchema } from '~/lib/server/validation'
import type { GameState, InventoryItem } from '~/lib/types/domain'
import { lookupItem } from '~/lib/game-logic/items'
import {
  effectiveWeaponModLimit,
  lookupWeapon,
  type WeaponData,
} from '~/lib/game-logic/weapons'
import { effectiveArmorModLimit, lookupArmor } from '~/lib/game-logic/armors'
import { lookupManufacturer } from '~/lib/game-logic/manufacturers'
import { lookupArmorMod } from '~/lib/game-logic/armor-mods'
import {
  classifyFirearm,
  firearmModsConsumed,
  isFirearmLike,
  lookupFirearmMod,
  validateFirearmModSelection,
} from '~/lib/game-logic/firearm-mods'
import {
  lookupMeleeMod,
  validateMeleeModSelection,
} from '~/lib/game-logic/melee-mods'

type Owner =
  { type: 'character'; characterId: string } | { type: 'game'; gameId: string }

// Flatten the `Owner` union into the `{type, id}` shape the atomic-transfer
// RPCs take.
function ownerArgs(o: Owner): { type: 'character' | 'game'; id: string } {
  return o.type === 'character'
    ? { type: 'character', id: o.characterId }
    : { type: 'game', id: o.gameId }
}

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
  .validator(
    z.object({
      owner: ownerSchema,
      source: z.enum(['catalog', 'custom']),
      name: z.string(),
      quantity: z.number().int(),
      location: z.string().optional(),
      description: z.string().optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const entry = buildEntry(data)
    const current = await readInventory(supabase, data.owner)
    await writeInventory(supabase, data.owner, [...current, entry])
    return entry
  })

export const updateInventoryItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      owner: ownerSchema,
      itemId: uuidSchema,
      updates: z.object({
        quantity: z.number().int().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        name: z.string().optional(),
        currentDurability: z.number().int().optional(),
        currentAmmo: z.number().int().optional(),
        /** `null` clears the manufacturer; only allowed on weapon/armor entries. */
        manufacturerRef: z.string().nullable().optional(),
        /** Replace the attached mod list. Validated against the item's allow-list. */
        mods: z.array(z.string()).optional(),
      }),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const current = await readInventory(supabase, data.owner)
    const idx = current.findIndex((e) => e.id === data.itemId)
    if (idx < 0) throw new Error('Item not found')

    const existing = current[idx]
    const next: InventoryItem = { ...existing }
    if (data.updates.quantity !== undefined) {
      if (data.updates.quantity < 1)
        throw new Error('Quantity must be at least 1')
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
      if (existing.source === 'catalog') {
        throw new Error('Cannot rename a catalog item')
      }
      const trimmed = data.updates.name.trim()
      if (!trimmed) throw new Error('Name cannot be empty')
      next.name = trimmed
    }
    if (data.updates.currentDurability !== undefined) {
      if (existing.source !== 'armor') {
        throw new Error('Only armor tracks durability')
      }
      if (!existing.armorRef) throw new Error('Missing armorRef')
      const armor = lookupArmor(existing.armorRef)
      if (!armor) throw new Error('Unknown armor')
      if (armor.durability == null) {
        throw new Error('This armor does not track durability')
      }
      const clamped = Math.max(
        0,
        Math.min(armor.durability, data.updates.currentDurability),
      )
      next.currentDurability = clamped
    }
    if (data.updates.currentAmmo !== undefined) {
      if (existing.source !== 'weapon') {
        throw new Error('Only weapons track ammo')
      }
      if (!existing.weaponRef) throw new Error('Missing weaponRef')
      const weapon = lookupWeapon(existing.weaponRef)
      if (!weapon) throw new Error('Unknown weapon')
      if (weapon.magazine == null) {
        throw new Error('This weapon does not track ammo')
      }
      const clamped = Math.max(
        0,
        Math.min(weapon.magazine, data.updates.currentAmmo),
      )
      next.currentAmmo = clamped
    }
    if (data.updates.manufacturerRef !== undefined) {
      if (existing.source !== 'weapon' && existing.source !== 'armor') {
        throw new Error('Only weapons and armor have manufacturers')
      }
      if (data.updates.manufacturerRef === null) {
        delete next.manufacturerRef
      } else {
        const manufacturer = lookupManufacturer(data.updates.manufacturerRef)
        if (!manufacturer) {
          throw new Error(
            `Unknown manufacturer: ${data.updates.manufacturerRef}`,
          )
        }
        if (existing.source === 'armor') {
          if (!manufacturer.applicableTo.includes('armor')) {
            throw new Error(
              `Manufacturer ${manufacturer.name} does not produce armor`,
            )
          }
        } else {
          if (!existing.weaponRef) throw new Error('Missing weaponRef')
          const weapon = lookupWeapon(existing.weaponRef)
          if (!weapon) throw new Error('Unknown weapon')
          const expected = weaponManufacturerType(weapon)
          if (!manufacturer.applicableTo.includes(expected)) {
            throw new Error(
              `Manufacturer ${manufacturer.name} does not produce ${expected} weapons`,
            )
          }
        }
        next.manufacturerRef = manufacturer.name
      }
    }
    if (data.updates.mods !== undefined) {
      const mods = data.updates.mods
      if (new Set(mods).size !== mods.length) {
        throw new Error('Mod list contains duplicates')
      }
      if (existing.source === 'armor') {
        if (!existing.armorRef) throw new Error('Missing armorRef')
        const armor = lookupArmor(existing.armorRef)
        if (!armor) throw new Error('Unknown armor')
        const allowed = new Set(armor.moddingOptions)
        for (const name of mods) {
          if (!allowed.has(name)) {
            throw new Error(`Mod "${name}" is not compatible with this armor`)
          }
          if (!lookupArmorMod(name)) {
            throw new Error(`Unknown armor mod: ${name}`)
          }
        }
        // Use the about-to-be-saved manufacturer when computing the cap, so
        // a paired "change manufacturer + change mods" update validates
        // against the final state rather than the pre-update one.
        const limit = effectiveArmorModLimit(armor, next.manufacturerRef)
        if (mods.length > limit) {
          throw new Error(
            `Too many mods (${mods.length}); effective limit is ${limit}`,
          )
        }
        if (mods.length === 0) {
          delete next.mods
        } else {
          next.mods = mods
        }
      } else if (existing.source === 'weapon') {
        if (!existing.weaponRef) throw new Error('Missing weaponRef')
        const weapon = lookupWeapon(existing.weaponRef)
        if (!weapon) throw new Error('Unknown weapon')
        if (weapon.type === 'Throwing') {
          if (mods.length > 0) {
            throw new Error('Throwing weapons cannot be modded')
          }
        } else if (isFirearmLike(weapon)) {
          const category = classifyFirearm(weapon)
          for (const name of mods) {
            const mod = lookupFirearmMod(name)
            if (!mod) throw new Error(`Unknown firearm mod: ${name}`)
            if (
              mod.compatibleWith !== 'Any' &&
              mod.compatibleWith !== category
            ) {
              throw new Error(
                `Mod "${name}" is not compatible with this weapon's class (${category})`,
              )
            }
          }
          const slotCheck = validateFirearmModSelection(mods)
          if (!slotCheck.ok) throw new Error(slotCheck.reason)
          const consumed = firearmModsConsumed(mods)
          const limit = effectiveWeaponModLimit(
            weapon,
            next.manufacturerRef,
            mods,
          )
          if (consumed > limit) {
            throw new Error(
              `Too many mods (${consumed}); effective limit is ${limit}`,
            )
          }
        } else {
          // Melee.
          for (const name of mods) {
            if (!lookupMeleeMod(name)) {
              throw new Error(`Unknown melee mod: ${name}`)
            }
          }
          const slotCheck = validateMeleeModSelection(mods)
          if (!slotCheck.ok) throw new Error(slotCheck.reason)
          const limit = effectiveWeaponModLimit(
            weapon,
            next.manufacturerRef,
            mods,
          )
          if (mods.length > limit) {
            throw new Error(
              `Too many mods (${mods.length}); effective limit is ${limit}`,
            )
          }
        }
        if (mods.length === 0) {
          delete next.mods
        } else {
          next.mods = mods
        }
      } else {
        throw new Error('Only weapons and armor can carry mods')
      }
    }

    const arr = current.slice()
    arr[idx] = next
    await writeInventory(supabase, data.owner, arr)
    return next
  })

export const removeInventoryItem = createServerFn({ method: 'POST' })
  .validator(z.object({ owner: ownerSchema, itemId: uuidSchema }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const current = await readInventory(supabase, data.owner)
    const next = current.filter((e) => e.id !== data.itemId)
    if (next.length === current.length) throw new Error('Item not found')
    await writeInventory(supabase, data.owner, next)
    return { removed: data.itemId }
  })

export const transferInventoryItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      from: ownerSchema,
      to: ownerSchema,
      itemId: uuidSchema,
      /** Partial transfer; omit to move the entire stack. */
      quantity: z.number().int().optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const fromInventory = await readInventory(supabase, data.from)
    const idx = fromInventory.findIndex((e) => e.id === data.itemId)
    if (idx < 0) throw new Error('Item not found in source inventory')
    const source = fromInventory[idx]
    const moveQty = data.quantity ?? source.quantity
    if (moveQty < 1) throw new Error('Quantity must be at least 1')
    if (moveQty > source.quantity)
      throw new Error('Not enough quantity to transfer')

    const partial = moveQty < source.quantity
    const updatedFrom = partial
      ? fromInventory.map((e, i) =>
          i === idx ? { ...e, quantity: e.quantity - moveQty } : e,
        )
      : fromInventory.filter((_, i) => i !== idx)

    let moved: InventoryItem = partial
      ? { ...source, id: crypto.randomUUID(), quantity: moveQty }
      : source
    // `equipped` only has meaning on a character; strip it on the way to the
    // party bag so weapons don't show up "equipped" in the shared inventory.
    if (data.to.type === 'game' && moved.equipped !== undefined) {
      const { equipped: _drop, ...rest } = moved
      void _drop
      moved = rest
    }

    // Single transaction: source-replace + destination-append commit together,
    // so a failure between them can't lose the item. The destination append is
    // a JSONB concat (not a read-modify-write) so concurrent additions to the
    // same destination don't clobber each other.
    const from = ownerArgs(data.from)
    const to = ownerArgs(data.to)
    const { error } = await supabase.rpc('transfer_inventory_item', {
      p_from_type: from.type,
      p_from_id: from.id,
      p_new_from_inventory: updatedFrom as never,
      p_to_type: to.type,
      p_to_id: to.id,
      p_moved_item: moved as never,
    })
    if (error) throw new Error(error.message)

    return { moved }
  })

// ---------------------------------------------------------------------------
// Weapon-specific operations.

export const addWeapon = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      owner: ownerSchema,
      weaponRef: z.string(),
      /** Throwing weapons (modLimit 0) skip the manufacturer step entirely. */
      manufacturerRef: z.string().optional(),
      /** Optional override; defaults to the catalog's illustrative name. */
      name: z.string().optional(),
      location: z.string().optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const catalog = lookupWeapon(data.weaponRef)
    if (!catalog) throw new Error(`Unknown weapon: ${data.weaponRef}`)

    let manufacturerName: string | undefined
    if (data.manufacturerRef) {
      const manufacturer = lookupManufacturer(data.manufacturerRef)
      if (!manufacturer) {
        throw new Error(`Unknown manufacturer: ${data.manufacturerRef}`)
      }
      const expectedType = weaponManufacturerType(catalog)
      if (!manufacturer.applicableTo.includes(expectedType)) {
        throw new Error(
          `Manufacturer ${manufacturer.name} does not produce ${expectedType} weapons`,
        )
      }
      manufacturerName = manufacturer.name
    } else if (catalog.type !== 'Throwing') {
      throw new Error('A manufacturer is required for this weapon')
    }

    const name = (data.name?.trim() || catalog.illustrativeName).trim()
    const location = data.location?.trim() || undefined

    const entry: InventoryItem = {
      id: crypto.randomUUID(),
      source: 'weapon',
      name,
      weaponRef: data.weaponRef,
      ...(manufacturerName ? { manufacturerRef: manufacturerName } : {}),
      quantity: 1,
      ...(location ? { location } : {}),
      ...(catalog.magazine != null ? { currentAmmo: catalog.magazine } : {}),
      ...(data.owner.type === 'character' ? { equipped: false } : {}),
    }

    const current = await readInventory(supabase, data.owner)
    await writeInventory(supabase, data.owner, [...current, entry])
    return entry
  })

/** Map a weapon to the manufacturer applicableTo bucket. */
function weaponManufacturerType(weapon: WeaponData): 'firearms' | 'melee' {
  return isFirearmLike(weapon) ? 'firearms' : 'melee'
}

export const setEquipped = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      characterId: uuidSchema,
      itemId: uuidSchema,
      equipped: z.boolean(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const owner: Owner = { type: 'character', characterId: data.characterId }
    const current = await readInventory(supabase, owner)
    const idx = current.findIndex((e) => e.id === data.itemId)
    if (idx < 0) throw new Error('Item not found')
    const target = current[idx]
    if (target.source !== 'weapon' && target.source !== 'armor') {
      throw new Error('Only weapons and armor can be equipped')
    }

    // Singleton rule: equipping an armor unequips any other armor (only one
    // worn at a time per rulebook "worn armor"). Weapons stay unconstrained.
    const arr = current.map((entry, i) => {
      if (i === idx) return { ...entry, equipped: data.equipped }
      if (
        data.equipped &&
        target.source === 'armor' &&
        entry.source === 'armor' &&
        entry.equipped
      ) {
        return { ...entry, equipped: false }
      }
      return entry
    })
    await writeInventory(supabase, owner, arr)
    return arr[idx]
  })

export const addArmor = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      owner: ownerSchema,
      armorRef: z.string(),
      manufacturerRef: z.string(),
      name: z.string().optional(),
      location: z.string().optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const catalog = lookupArmor(data.armorRef)
    if (!catalog) throw new Error(`Unknown armor: ${data.armorRef}`)

    const manufacturer = lookupManufacturer(data.manufacturerRef)
    if (!manufacturer) {
      throw new Error(`Unknown manufacturer: ${data.manufacturerRef}`)
    }
    if (!manufacturer.applicableTo.includes('armor')) {
      throw new Error(
        `Manufacturer ${manufacturer.name} does not produce armor`,
      )
    }

    const name = (data.name?.trim() || catalog.illustrativeName).trim()
    const location = data.location?.trim() || undefined

    const entry: InventoryItem = {
      id: crypto.randomUUID(),
      source: 'armor',
      name,
      armorRef: data.armorRef,
      manufacturerRef: manufacturer.name,
      quantity: 1,
      ...(location ? { location } : {}),
      ...(catalog.durability != null
        ? { currentDurability: catalog.durability }
        : {}),
      ...(data.owner.type === 'character' ? { equipped: false } : {}),
    }

    const current = await readInventory(supabase, data.owner)
    await writeInventory(supabase, data.owner, [...current, entry])
    return entry
  })

// ---------------------------------------------------------------------------
// Currency operations.

export const setCurrency = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      owner: ownerSchema,
      credits: z.number().int().optional(),
      assets: z.number().int().optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

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
  .validator(
    z.object({
      from: ownerSchema,
      to: ownerSchema,
      kind: z.enum(['credits', 'assets']),
      amount: z.number().int(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context
    if (data.amount < 1) throw new Error('Amount must be at least 1')

    const from = ownerArgs(data.from)
    const to = ownerArgs(data.to)
    // Single transaction: the debit's balance check lives inside the function's
    // WHERE clause, so concurrent transfers can't both overdraw the same source.
    const { error } = await supabase.rpc('transfer_currency', {
      p_from_type: from.type,
      p_from_id: from.id,
      p_to_type: to.type,
      p_to_id: to.id,
      p_kind: data.kind,
      p_amount: data.amount,
    })
    if (error) throw new Error(error.message)
    return { moved: data.amount }
  })

// ---------------------------------------------------------------------------
// Loader.

export const loadGameState = createServerFn({ method: 'GET' })
  .validator(z.object({ gameId: uuidSchema }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const { data: row, error } = await supabase
      .from('game_state')
      .select('*')
      .eq('game_id', data.gameId)
      .single()
    if (error || !row) throw new Error('Game state not found')
    return row as unknown as GameState
  })
