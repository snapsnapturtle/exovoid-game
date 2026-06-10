import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import { defaultShipConfig, getShipClass } from '~/lib/game-logic/ships'
import type {
  FiringArc,
  Ship,
  ShipConfig,
  ShipDamage,
  ShipQuadrants,
} from '~/lib/types/database'

// Ships are collaborative table property: RLS lets every game member create,
// edit, duplicate and delete them (hidden ships restricted to GM + creator).
// Server-side validation is shape-sanity only — rule violations like capacity
// overspend are deliberately saveable (warn-don't-block, GM arbitrates).

const FIRING_ARCS = new Set<FiringArc>(['fore', 'aft', 'port', 'starboard'])
const VARIANTS = new Set(['standard', 'used', 'state_of_the_art'])

function sanitizeQuadrants(raw: unknown): ShipQuadrants {
  const q = (raw ?? {}) as Partial<ShipQuadrants>
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0
  return {
    fore: num(q.fore),
    aft: num(q.aft),
    port: num(q.port),
    starboard: num(q.starboard),
  }
}

function sanitizeConfig(raw: ShipConfig): ShipConfig {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid ship config')
  if (!getShipClass(raw.classRef)) throw new Error('Unknown ship class')
  if (!VARIANTS.has(raw.variant)) throw new Error('Unknown ship variant')
  const modules = (Array.isArray(raw.modules) ? raw.modules : []).flatMap(
    (m) =>
      m && typeof m.id === 'string' && typeof m.moduleRef === 'string'
        ? [{ id: m.id, moduleRef: m.moduleRef }]
        : [],
  )
  const weapons = (Array.isArray(raw.weapons) ? raw.weapons : []).flatMap(
    (w) =>
      w && typeof w.id === 'string' && typeof w.weaponRef === 'string'
        ? [
            {
              id: w.id,
              weaponRef: w.weaponRef,
              ...(typeof w.name === 'string' ? { name: w.name } : {}),
              ...(w.arc && FIRING_ARCS.has(w.arc) ? { arc: w.arc } : {}),
            },
          ]
        : [],
  )
  return {
    classRef: raw.classRef,
    variant: raw.variant,
    modules,
    weapons,
    armorAllocation: sanitizeQuadrants(raw.armorAllocation),
    shieldAllocation: sanitizeQuadrants(raw.shieldAllocation),
  }
}

function sanitizeDamage(raw: ShipDamage): ShipDamage {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid ship damage')
  const hull =
    typeof raw.hullCurrent === 'number' && Number.isFinite(raw.hullCurrent)
      ? Math.max(0, raw.hullCurrent)
      : null
  return {
    hullCurrent: hull,
    armorCurrent: raw.armorCurrent ? sanitizeQuadrants(raw.armorCurrent) : null,
    shieldCurrent: raw.shieldCurrent
      ? sanitizeQuadrants(raw.shieldCurrent)
      : null,
  }
}

export const createShip = createServerFn({ method: 'POST' })
  .validator((d: { gameId: string; name: string; classRef: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const trimmed = data.name.trim()
    if (!trimmed) throw new Error('Name is required')
    if (!getShipClass(data.classRef)) throw new Error('Unknown ship class')

    const { data: row, error } = await supabase
      .from('ships')
      .insert({
        game_id: data.gameId,
        created_by: user.id,
        name: trimmed,
        config: defaultShipConfig(data.classRef),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return row as unknown as Ship
  })

export const getShip = createServerFn({ method: 'GET' })
  .validator((d: { shipId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: row, error } = await supabase
      .from('ships')
      .select('*')
      .eq('id', data.shipId)
      .single()

    if (error || !row) throw new Error('Ship not found')
    return row as unknown as Ship
  })

/** Every ship in the game the caller may see — RLS hides GM-prepped ships
 * with visible_to_players = false. */
export const listShips = createServerFn({ method: 'GET' })
  .validator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: rows, error } = await supabase
      .from('ships')
      .select('*')
      .eq('game_id', data.gameId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (rows ?? []) as unknown as Ship[]
  })

export const updateShip = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      shipId: string
      updates: {
        name?: string
        visible_to_players?: boolean
        config?: ShipConfig
        damage?: ShipDamage
        notes?: string
      }
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const updates: Record<string, unknown> = {}
    if (data.updates.name !== undefined) {
      const trimmed = data.updates.name.trim()
      if (!trimmed) throw new Error('Name is required')
      updates.name = trimmed
    }
    if (data.updates.visible_to_players !== undefined) {
      updates.visible_to_players = data.updates.visible_to_players === true
    }
    if (data.updates.config !== undefined) {
      updates.config = sanitizeConfig(data.updates.config)
    }
    if (data.updates.damage !== undefined) {
      updates.damage = sanitizeDamage(data.updates.damage)
    }
    if (data.updates.notes !== undefined) {
      updates.notes = String(data.updates.notes)
    }
    if (Object.keys(updates).length === 0) throw new Error('Nothing to update')

    const { data: row, error } = await supabase
      .from('ships')
      .update(updates as never)
      .eq('id', data.shipId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return row as unknown as Ship
  })

/** Clone a ship in the same game — the "play around with options" escape
 * hatch. Build carries over; damage resets so the copy starts pristine.
 * Any member who can see the source may duplicate (unlike NPC duplication,
 * which is GM-only). */
export const duplicateShip = createServerFn({ method: 'POST' })
  .validator((d: { shipId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: source, error: fetchError } = await supabase
      .from('ships')
      .select('*')
      .eq('id', data.shipId)
      .single()
    if (fetchError || !source) throw new Error('Ship not found')

    const ship = source as unknown as Ship

    const { data: row, error } = await supabase
      .from('ships')
      .insert({
        game_id: ship.game_id,
        created_by: user.id,
        name: `Copy of ${ship.name}`,
        visible_to_players: ship.visible_to_players,
        config: ship.config,
        notes: ship.notes,
        // damage defaults to all-null = undamaged
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return row as unknown as Ship
  })

export const deleteShip = createServerFn({ method: 'POST' })
  .validator((d: { shipId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('ships')
      .delete()
      .eq('id', data.shipId)

    if (error) throw new Error(error.message)
  })
