import { Link } from '@tanstack/react-router'
import type { InventoryItem } from '~/lib/types/database'
import { lookupWeapon } from '~/lib/game-logic/weapons'
import { equippedArmor } from '~/lib/game-logic/armors'
import { QualityBadge } from '~/components/inventory/QualityBadge'

interface ActionsTabProps {
  inventory: InventoryItem[]
  gameId: string
  characterId: string
  canEdit: boolean
}

/**
 * The "Actions" tab on the character sheet. Surfaces the character's
 * currently equipped weapons and armor as compact cards — talents and
 * activated cyberware will join here later as the action-card pattern
 * crystallises.
 */
export function ActionsTab({
  inventory,
  gameId,
  characterId,
  canEdit,
}: ActionsTabProps) {
  const weapons = inventory.filter(
    (i) => i.source === 'weapon' && i.equipped && i.weaponRef,
  )
  const worn = equippedArmor(inventory)

  if (weapons.length === 0 && !worn) {
    return (
      <div className="space-y-3">
        <p className="py-6 text-center text-sm text-gray-700">
          Nothing equipped.
        </p>
        {canEdit && (
          <p className="text-center text-xs text-gray-700">
            Pick up gear in your{' '}
            <Link
              to="/games/$gameId/characters/$characterId/inventory"
              params={{ gameId, characterId }}
              className="text-accent-900 transition hover:text-accent-900"
            >
              inventory
            </Link>
            , then toggle Equip on a weapon or armor.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {worn && <EquippedArmorCard entry={worn.entry} armor={worn.data} />}
      {weapons.length > 0 && (
        <ul className="space-y-2">
          {weapons.map((entry) => {
            const w = lookupWeapon(entry.weaponRef!)
            if (!w) return null
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-accent-700/40 bg-gray-100/40 p-3"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold text-white">{entry.name}</span>
                  <span className="rounded border border-accent-700/40 bg-accent-700/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-900">
                    {w.type} · {w.weapon}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-900">
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
                  <p className="mt-2 whitespace-pre-line text-xs text-gray-900">
                    {w.specialRules}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function EquippedArmorCard({
  entry,
  armor,
}: {
  entry: InventoryItem
  armor: NonNullable<
    ReturnType<typeof import('~/lib/game-logic/armors').lookupArmor>
  >
}) {
  const tracksDurability = armor.durability != null
  const current = entry.currentDurability ?? armor.durability ?? 0
  const broken = tracksDurability && current <= 0
  const activeSoak = broken ? armor.secondarySoak : armor.primarySoak

  return (
    <div className="rounded-lg border border-accent-700/40 bg-gray-100/40 p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-semibold text-white">{entry.name}</span>
        <span className="rounded border border-accent-700/40 bg-accent-700/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-900">
          Armor · {armor.type}
        </span>
        {broken && (
          <span className="rounded border border-warning-700/60 bg-warning-700/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-900">
            Broken
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-900">
        <Stat label="Soak">
          <span className={broken ? 'text-warning-900' : 'text-gray-1000'}>
            {activeSoak}
          </span>
          <span className="text-gray-700">
            {' '}
            (pri {armor.primarySoak} / sec {armor.secondarySoak})
          </span>
        </Stat>
        {tracksDurability && (
          <Stat label="Durability">
            <span className={broken ? 'text-warning-900' : 'text-gray-1000'}>
              {current}
            </span>
            <span className="text-gray-700"> / {armor.durability}</span>
          </Stat>
        )}
      </div>
      {armor.qualities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {armor.qualities.map((q) => (
            <QualityBadge key={q} raw={q} variant="quality" />
          ))}
        </div>
      )}
      {armor.specialRules && (
        <p className="mt-2 whitespace-pre-line text-xs text-gray-900">
          {armor.specialRules}
        </p>
      )}
    </div>
  )
}

function Stat({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <span>
      <span className="text-gray-700">{label}:</span>{' '}
      <span className="text-gray-1000">{children}</span>
    </span>
  )
}
