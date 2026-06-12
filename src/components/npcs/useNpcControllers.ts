import { useCallback, useMemo } from 'react'
import type { Character } from '~/lib/types/domain'

interface GameMemberLike {
  user_id: string
  role: string
  profiles: { display_name: string | null } | null
}

/**
 * Resolve NPC controller display names and "is this mine?" status from the
 * game's member list. Shared by the game lobby and the NPC roster, which both
 * render the same controller line on NPC cards.
 *
 * `controller_user_id === null` means the GM implicitly controls (no
 * delegation); we surface the GM's actual name rather than the literal "GM".
 */
export function useNpcControllers(
  members: GameMemberLike[],
  currentUserId: string,
  isGm: boolean,
) {
  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members)
      map.set(m.user_id, m.profiles?.display_name || 'Unknown')
    return map
  }, [members])

  const gmName = useMemo(() => {
    const gm = members.find((m) => m.role === 'gm')
    return `${gm?.profiles?.display_name || 'GM'} (GM)`
  }, [members])

  const controllerLabel = useCallback(
    (npc: Character): string =>
      npc.controller_user_id === null
        ? gmName
        : (nameByUserId.get(npc.controller_user_id) ?? 'Unknown'),
    [gmName, nameByUserId],
  )

  /**
   * The GM implicitly controls every NPC with a null controller; players only
   * "own" NPCs explicitly delegated to them.
   */
  const isYours = useCallback(
    (npc: Character): boolean =>
      npc.controller_user_id === currentUserId ||
      (isGm && npc.controller_user_id === null),
    [currentUserId, isGm],
  )

  return { nameByUserId, controllerLabel, isYours }
}
