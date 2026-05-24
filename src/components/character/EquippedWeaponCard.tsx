import type { InventoryItem } from '~/lib/types/database'
import type { WeaponData } from '~/lib/game-logic/weapons'
import { QualityBadge } from '~/components/inventory/QualityBadge'
import { EffectTooltip } from '~/components/inventory/EffectTooltip'
import { isFirearmLike, lookupFirearmMod } from '~/lib/game-logic/firearm-mods'
import { lookupMeleeMod } from '~/lib/game-logic/melee-mods'

interface EquippedWeaponCardProps {
  entry: InventoryItem
  weapon: WeaponData
  /** Override entry.currentAmmo with a live value (e.g. optimistic in combat). */
  currentAmmo?: number
  /** Optional combat-side affordances rendered in a footer row (Attack/Reload buttons, ammo stepper). */
  footer?: React.ReactNode
}

/**
 * Read-only block that surfaces every combat-relevant property of an
 * equipped weapon: damage + type, AP, range, hands, magazine + reload,
 * qualities, trigger options, special rules. Used both on the character
 * sheet's Actions tab and inside each combat-tracker participant card.
 */
export function EquippedWeaponCard({
  entry,
  weapon,
  currentAmmo,
  footer,
}: EquippedWeaponCardProps) {
  const ammo = currentAmmo ?? entry.currentAmmo ?? weapon.magazine ?? 0
  const mods = entry.mods ?? []
  const isFirearm = isFirearmLike(weapon)
  return (
    <div className="rounded-lg border border-accent-700/40 bg-gray-100/40 p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-semibold text-white">{entry.name}</span>
        <span className="text-[10px] uppercase tracking-wide text-gray-700">
          {weapon.weapon}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-900">
        <Stat label="DMG">
          {weapon.damage} {weapon.damageType}
        </Stat>
        <Stat label="AP">{weapon.attackAP}</Stat>
        <Stat label="Range">
          {weapon.optimalRange}
          {weapon.maxRange != null ? ` / ${weapon.maxRange}` : ''}
        </Stat>
        <Stat label="Hands">{weapon.hands}</Stat>
        {weapon.magazine != null && (
          <Stat label="Mag">
            <span className="text-gray-1000">{ammo}</span>
            <span className="text-gray-700"> / {weapon.magazine}</span>
            {weapon.reloadAP != null && (
              <span className="text-gray-700">
                {' '}
                · reload {weapon.reloadAP} AP
              </span>
            )}
          </Stat>
        )}
      </div>
      {(weapon.qualities.length > 0 || weapon.triggerOptions.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {weapon.qualities.map((q) => (
            <QualityBadge key={`q-${q}`} raw={q} variant="quality" />
          ))}
          {weapon.triggerOptions.map((t) => (
            <QualityBadge key={`t-${t}`} raw={t} variant="trigger" />
          ))}
        </div>
      )}
      {mods.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-gray-700">Mods:</span>
          {mods.map((name) => {
            const data = isFirearm
              ? lookupFirearmMod(name)
              : lookupMeleeMod(name)
            return (
              <EffectTooltip key={name} text={data?.effects ?? 'Unknown mod.'}>
                <span className="cursor-help text-gray-1000 underline decoration-dotted underline-offset-2">
                  {name}
                </span>
              </EffectTooltip>
            )
          })}
        </div>
      )}
      {weapon.specialRules && (
        <p className="mt-2 whitespace-pre-line text-xs text-gray-900">
          {weapon.specialRules}
        </p>
      )}
      {footer}
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
