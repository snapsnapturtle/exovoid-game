import { Link } from '@tanstack/react-router'
import type { CyberwareEntry } from '~/lib/types/database'
import {
  lookupCyberware,
  occupationUsed,
} from '~/lib/game-logic/cyberware'

interface CyberwareTabProps {
  cyberware: CyberwareEntry[]
  capacity: number
  gameId: string
  characterId: string
}

export function CyberwareTab({
  cyberware,
  capacity,
  gameId,
  characterId,
}: CyberwareTabProps) {
  const used = occupationUsed(cyberware)
  const available = capacity - used

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-300">
          <span className="font-medium text-white">{used}</span>
          <span className="text-gray-500"> / </span>
          <span className="text-gray-400">{capacity}</span>
          <span className="ml-2 text-xs text-gray-500">
            ({available} free)
          </span>
        </div>
        <Link
          to="/games/$gameId/characters/$characterId/cyberware"
          params={{ gameId, characterId }}
          className="text-xs text-accent-400 transition hover:text-accent-300 hover:underline"
        >
          Manage cyberware →
        </Link>
      </div>

      {cyberware.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No cyberware installed.
        </p>
      ) : (
        <ul className="space-y-2">
          {cyberware.map((c) => {
            const meta = lookupCyberware(c.name)
            return (
              <li
                key={c.name}
                className="rounded border border-void-600 bg-void-700/40 p-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-md border border-void-500 bg-void-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-300">
                    {c.tier}
                  </span>
                  <span className="font-medium text-white">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.category}</span>
                </div>
                {meta?.description && (
                  <div className="mt-1 whitespace-pre-line text-xs text-gray-400">
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
