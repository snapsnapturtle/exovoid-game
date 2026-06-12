import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/Badge'
import { surfaceCardClasses, SurfaceArrow } from '~/components/ui/Surface'
import { CharacterPortrait } from '~/components/character/CharacterPortrait'
import type { Character } from '~/lib/types/database'

interface NpcRosterCardProps {
  npc: Character
  gameId: string
  /** Controller display name, or `null` to omit the "Controlled by" line
   * (used when the viewer already controls this NPC). */
  controllerLabel: string | null
}

/**
 * NPC card used by both the game lobby and the NPC roster. NPCs are rows in
 * the characters table, so the card links into the unified character tree.
 */
export function NpcRosterCard({
  npc,
  gameId,
  controllerLabel,
}: NpcRosterCardProps) {
  return (
    <Link
      to="/games/$gameId/characters/$characterId"
      params={{ gameId, characterId: npc.id }}
      className={surfaceCardClasses()}
    >
      <CharacterPortrait
        name={npc.name}
        portraitUrl={npc.portrait_url}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-medium text-white">{npc.name}</p>
          {npc.is_minion && (
            <Badge tone="warning" uppercase>
              Minion
            </Badge>
          )}
          {!npc.visible_to_players && (
            <Badge tone="neutral" uppercase title="Hidden from other players">
              Hidden
            </Badge>
          )}
        </div>
        {controllerLabel && (
          <p className="mt-0.5 text-xs text-gray-700">
            Controlled by {controllerLabel}
          </p>
        )}
      </div>
      <SurfaceArrow />
    </Link>
  )
}
