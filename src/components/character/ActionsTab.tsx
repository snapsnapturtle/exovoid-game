import { Link } from '@tanstack/react-router'
import type { InventoryItem } from '~/lib/types/database'
import { lookupWeapon } from '~/lib/game-logic/weapons'
import { QualityBadge } from '~/components/inventory/QualityBadge'

interface ActionsTabProps {
  inventory: InventoryItem[]
  gameId: string
  characterId: string
  canEdit: boolean
}

/**
 * The "Actions" tab on the character sheet. For now it surfaces the
 * character's currently equipped weapons as compact cards — talents and
 * activated cyberware will join here later as the action-card pattern
 * crystallises.
 */
export function ActionsTab({
  inventory,
  gameId,
  characterId,
  canEdit,
}: ActionsTabProps) {
  const equipped = inventory.filter(
    (i) => i.source === 'weapon' && i.equipped && i.weaponRef,
  )

  if (equipped.length === 0) {
    return (
      <div className="space-y-3">
        <p className="py-6 text-center text-sm text-gray-500">
          No weapons equipped.
        </p>
        {canEdit && (
          <p className="text-center text-xs text-gray-500">
            Add weapons in your{' '}
            <Link
              to="/games/$gameId/characters/$characterId/inventory"
              params={{ gameId, characterId }}
              className="text-accent-300 transition hover:text-accent-200"
            >
              inventory
            </Link>
            , then toggle Equip on the row.
          </p>
        )}
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {equipped.map((entry) => {
        const w = lookupWeapon(entry.weaponRef!)
        if (!w) return null
        return (
          <li
            key={entry.id}
            className="rounded-lg border border-cyber-500/40 bg-void-700/40 p-3"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-white">{entry.name}</span>
              <span className="rounded border border-cyber-500/40 bg-cyber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-cyber-300">
                {w.type} · {w.weapon}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
              <Stat label="DMG">
                {w.damage} {w.damageType}
              </Stat>
              <Stat label="AP">{w.attackAP}</Stat>
              <Stat label="Range">
                {w.optimalRange}
                {w.maxRange != null ? ` / ${w.maxRange}` : ''}
              </Stat>
              <Stat label="Hands">{w.hands}</Stat>
              {w.magazine != null && (
                <Stat label="Mag">
                  {w.magazine}
                  {w.reloadAP != null ? ` · reload ${w.reloadAP} AP` : ''}
                </Stat>
              )}
            </div>
            {(w.qualities.length > 0 || w.triggerOptions.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {w.qualities.map((q) => (
                  <QualityBadge key={`q-${q}`} raw={q} variant="quality" />
                ))}
                {w.triggerOptions.map((t) => (
                  <QualityBadge key={`t-${t}`} raw={t} variant="trigger" />
                ))}
              </div>
            )}
            {w.specialRules && (
              <p className="mt-2 whitespace-pre-line text-xs text-gray-400">
                {w.specialRules}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span>
      <span className="text-gray-500">{label}:</span>{' '}
      <span className="text-gray-200">{children}</span>
    </span>
  )
}
