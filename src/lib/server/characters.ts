import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import type {
  Character,
  CharacterAttributes,
  DerivedStatBonuses,
  InjuryEntry,
  PendingBonus,
  TalentEntry,
} from '~/lib/types/database'
import type { CareerData } from '~/lib/game-logic/talents'
import { validateCreation } from '~/lib/game-logic/character-creation'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import {
  canInstall as canInstallCyberware,
  makeCyberwareEntry,
  occupationUsed,
} from '~/lib/game-logic/cyberware'
import {
  normalizeAllocations,
  validateAllocations,
} from '~/lib/game-logic/cyberware-malfunctions'
import careersData from '~/data/careers.json'

const careers = careersData as CareerData[]

export const createCharacter = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      gameId: string
      name: string
      career: string
      gender?: string
      age?: number | null
      background_notes?: string
      attributes: CharacterAttributes
      /** Pre-bonus attribute allocation, validated separately against the 28+6/4 caps. */
      baseAttributes?: CharacterAttributes
      skills: Record<string, number>
      /** Pre-bonus final skills (career baseline + spent points), validated separately. */
      baseFinalSkills?: Record<string, number>
      talents?: TalentEntry[]
      credits?: number
      assets?: number
      derived_stat_bonuses?: DerivedStatBonuses
      skillPointsBudget?: number
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    if (!data.name.trim()) throw new Error('Name is required')

    const check = validateCreation(
      {
        careerName: data.career,
        attributes: data.attributes,
        baseAttributes: data.baseAttributes,
        finalSkills: data.skills,
        baseFinalSkills: data.baseFinalSkills,
        talents: data.talents ?? [],
        skillPointsBudget: data.skillPointsBudget,
      },
      careers,
    )
    if (!check.ok) {
      throw new Error(`Invalid character: ${check.errors.join(' ')}`)
    }

    const { data: character, error } = await supabase
      .from('characters')
      .insert({
        game_id: data.gameId,
        user_id: user.id,
        name: data.name,
        career: data.career,
        gender: data.gender ?? '',
        age: data.age ?? null,
        background_notes: data.background_notes ?? '',
        attributes: data.attributes,
        skills: data.skills,
        talents: (data.talents ?? []) as never,
        credits: data.credits ?? 1000,
        assets: data.assets ?? 0,
        derived_stat_bonuses: (data.derived_stat_bonuses ?? {}) as never,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return character as unknown as Character
  })

export const getCharacter = createServerFn()
  .validator((d: { characterId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', data.characterId)
      .single()

    if (error || !character) throw new Error('Character not found')

    const isOwner = character.user_id === user.id

    const { data: game } = await supabase
      .from('games')
      .select('gm_id')
      .eq('id', character.game_id)
      .single()

    const isGm = game?.gm_id === user.id

    // Stat-edit rights:
    //   PC  → owner (= player) or GM.
    //   NPC → GM or the delegated controller. The creator alone is NOT
    //         enough (matches the tightened RLS UPDATE policy) — they
    //         keep banner-edit rights via update_npc_flags but lose stat
    //         edits after handing the NPC off.
    const canEdit = character.is_npc
      ? isGm || character.controller_user_id === user.id
      : isOwner || isGm

    return {
      character: character as unknown as Character,
      isOwner,
      canEdit,
    }
  })

export const updateCharacter = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      characterId: string
      updates: {
        name?: string
        career?: string
        level?: number
        experience?: number
        gender?: string
        age?: number | null
        background_notes?: string
        attributes?: CharacterAttributes
        skills?: Record<string, number>
        talents?: TalentEntry[]
        edge_current?: number
        health_current?: number | null
        injuries?: InjuryEntry[]
        pending_bonuses?: PendingBonus[]
        favorite_skills?: string[]
        notes?: string
        portrait_url?: string | null
        downtime_uses_used?: Record<string, number>
      }
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: character, error } = await supabase
      .from('characters')
      .update(data.updates as never)
      .eq('id', data.characterId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return character as unknown as Character
  })

export const grantTalent = createServerFn({ method: 'POST' })
  .validator((d: { characterId: string; talentName: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: row, error: readErr } = await supabase
      .from('characters')
      .select('*')
      .eq('id', data.characterId)
      .single()
    if (readErr || !row) throw new Error('Character not found')

    const character = row as unknown as Character
    if (character.talents.some((t) => t.name === data.talentName)) {
      throw new Error('Talent already on this character.')
    }

    const entry: TalentEntry = {
      name: data.talentName,
      career: '',
      tier: 0,
      acquiredAt: character.level,
      granted: true,
    }
    const nextTalents = [...character.talents, entry]

    const { data: updated, error } = await supabase
      .from('characters')
      .update({ talents: nextTalents } as never)
      .eq('id', data.characterId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return updated as unknown as Character
  })

export const installCyberware = createServerFn({ method: 'POST' })
  .validator((d: { characterId: string; cyberwareName: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: row, error: readErr } = await supabase
      .from('characters')
      .select('*')
      .eq('id', data.characterId)
      .single()
    if (readErr || !row) throw new Error('Character not found')

    const character = row as unknown as Character
    const { derived } = applyPassiveEffects(
      character.attributes,
      character.talents,
      character.cyberware,
      character.inventory,
      character.derived_stat_bonuses,
    )
    const check = canInstallCyberware(
      character,
      data.cyberwareName,
      derived.cyberImmunity,
    )
    if (!check.ok) throw new Error(check.reason ?? 'Cannot install cyberware')

    const entry = makeCyberwareEntry(data.cyberwareName, character.level)
    if (!entry) throw new Error('Unknown cyberware')

    const filtered = check.replaces
      ? character.cyberware.filter((c) => c.name !== check.replaces)
      : character.cyberware
    const nextCyberware = [...filtered, entry]
    const updates = withAllocationReset(character, nextCyberware)

    const { data: updated, error } = await supabase
      .from('characters')
      .update(updates as never)
      .eq('id', data.characterId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return updated as unknown as Character
  })

export const uninstallCyberware = createServerFn({ method: 'POST' })
  .validator((d: { characterId: string; cyberwareName: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: row, error: readErr } = await supabase
      .from('characters')
      .select('*')
      .eq('id', data.characterId)
      .single()
    if (readErr || !row) throw new Error('Character not found')

    const character = row as unknown as Character
    const nextCyberware = character.cyberware.filter(
      (c) => c.name !== data.cyberwareName,
    )
    const updates = withAllocationReset(character, nextCyberware)

    const { data: updated, error } = await supabase
      .from('characters')
      .update(updates as never)
      .eq('id', data.characterId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return updated as unknown as Character
  })

/**
 * Build a partial update for cyberware change. When the new occupation no
 * longer exceeds capacity, also blank the malfunction allocations — they
 * only have meaning while overloaded, and stale entries would otherwise
 * fail the strict total-must-equal-excess validator.
 */
function withAllocationReset(
  character: Character,
  nextCyberware: Character['cyberware'],
): { cyberware: Character['cyberware']; malfunction_allocations?: [] } {
  const { derived } = applyPassiveEffects(
    character.attributes,
    character.talents,
    nextCyberware,
    character.inventory,
    character.derived_stat_bonuses,
  )
  const used = occupationUsed(nextCyberware)
  if (used <= derived.cyberImmunity) {
    return { cyberware: nextCyberware, malfunction_allocations: [] }
  }
  return { cyberware: nextCyberware }
}

export const setMalfunctionAllocations = createServerFn({ method: 'POST' })
  .validator((d: { characterId: string; allocations: number[] }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: row, error: readErr } = await supabase
      .from('characters')
      .select('*')
      .eq('id', data.characterId)
      .single()
    if (readErr || !row) throw new Error('Character not found')

    const character = row as unknown as Character
    const { derived } = applyPassiveEffects(
      character.attributes,
      character.talents,
      character.cyberware,
      character.inventory,
      character.derived_stat_bonuses,
    )
    const used = occupationUsed(character.cyberware)
    const excess = Math.max(0, used - derived.cyberImmunity)
    const normalized = normalizeAllocations(data.allocations)
    const check = validateAllocations(normalized, excess)
    if (!check.ok) throw new Error(check.reason ?? 'Invalid allocations')

    const { data: updated, error } = await supabase
      .from('characters')
      .update({ malfunction_allocations: normalized } as never)
      .eq('id', data.characterId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return updated as unknown as Character
  })

export const deleteCharacter = createServerFn({ method: 'POST' })
  .validator((d: { characterId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // RLS ("Owner or GM can delete character") gates the actual permission
    // check; we still need to read the row first to know which game to
    // return so the caller can navigate back to the lobby.
    const { data: character } = await supabase
      .from('characters')
      .select('game_id')
      .eq('id', data.characterId)
      .single()

    if (!character) throw new Error('Character not found')

    // Scrub portrait objects *before* deleting the row: storage RLS gates
    // writes on a SELECT against the character row, so once the row is gone
    // the storage delete is silently denied.
    const { data: objects } = await supabase.storage
      .from('character-portraits')
      .list(data.characterId)
    if (objects && objects.length > 0) {
      const { error: rmError } = await supabase.storage
        .from('character-portraits')
        .remove(objects.map((o) => `${data.characterId}/${o.name}`))
      if (rmError) throw new Error(rmError.message)
    }

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', data.characterId)

    if (error) throw new Error(error.message)

    return { gameId: character.game_id }
  })

export const updatePortraitUrl = createServerFn({ method: 'POST' })
  .validator((d: { characterId: string; portraitUrl: string | null }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: character, error } = await supabase
      .from('characters')
      .update({ portrait_url: data.portraitUrl } as never)
      .eq('id', data.characterId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return character as unknown as Character
  })
