import { Link } from '@tanstack/react-router'
import type { CyberwareEntry } from '~/lib/types/database'
import { lookupCyberware, occupationUsed } from '~/lib/game-logic/cyberware'
import { buttonClasses } from '~/components/ui/Button'
import { Badge } from '~/components/ui/Badge'

interface CyberwareTabProps {
  cyberware: CyberwareEntry[]
  capacity: number
  gameId: string
  characterId: string
  /** Pick the NPC-flavoured manage route when true (PCs and NPCs use the
   * same component but live under different `$gameId/...` segments). */
  isNpc?: boolean
}

export function CyberwareTab({
  cyberware,
  capacity,
  gameId,
  characterId,
  isNpc = false,
}: CyberwareTabProps) {
  const used = occupationUsed(cyberware)
  const available = capacity - used

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-1000">
          <span className="font-medium text-white">{used}</span>
          <span className="text-gray-700"> / </span>
          <span className="text-gray-900">{capacity}</span>
          <span className="ml-2 text-xs text-gray-700">({available} free)</span>
        </div>
        {isNpc ? (
          <Link
            to="/games/$gameId/npcs/$npcId/cyberware"
            params={{ gameId, npcId: characterId }}
            className={buttonClasses('secondary', 'sm')}
          >
            Manage cyberware
          </Link>
        ) : (
          <Link
            to="/games/$gameId/characters/$characterId/cyberware"
            params={{ gameId, characterId }}
            className={buttonClasses('secondary', 'sm')}
          >
            Manage cyberware
          </Link>
        )}
      </div>

      {cyberware.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-700">
          No cyberware installed.
        </p>
      ) : (
        <ul className="space-y-2">
          {cyberware.map((c) => {
            const meta = lookupCyberware(c.name)
            return (
              <li
                key={c.name}
                className="rounded border border-gray-400 bg-gray-100/40 p-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="neutral" uppercase>
                    {c.tier}
                  </Badge>
                  <span className="font-medium text-white">{c.name}</span>
                  <span className="text-xs text-gray-700">{c.category}</span>
                </div>
                {meta?.description && (
                  <div className="mt-1 whitespace-pre-line text-xs text-gray-900">
                    {meta.description}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
