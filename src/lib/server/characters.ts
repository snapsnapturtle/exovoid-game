import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import type { Character, CharacterAttributes } from '~/lib/types/database'

export const createCharacter = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      gameId: string
      name: string
      career: string
      attributes: CharacterAttributes
      skills: Record<string, number>
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
      .insert({
        game_id: data.gameId,
        user_id: user.id,
        name: data.name,
        career: data.career,
        attributes: data.attributes,
        skills: data.skills,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return character as unknown as Character
  })

export const getCharacter = createServerFn()
  .inputValidator((d: { characterId: string }) => d)
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

    // Check if GM
    const { data: game } = await supabase
      .from('games')
      .select('gm_id')
      .eq('id', character.game_id)
      .single()

    const isGm = game?.gm_id === user.id

    return {
      character: character as unknown as Character,
      isOwner,
      canEdit: isOwner || isGm,
    }
  })

export const updateCharacter = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      characterId: string
      updates: {
        name?: string
        career?: string
        gender?: string
        age?: number | null
        background_notes?: string
        attributes?: CharacterAttributes
        skills?: Record<string, number>
        edge_current?: number
        health_current?: number | null
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

    const { data: character, error } = await supabase
      .from('characters')
      .update(data.updates)
      .eq('id', data.characterId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return character as unknown as Character
  })
