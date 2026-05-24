import type { InventoryItem } from '~/lib/types/database'
import type { ArmorData } from '~/lib/game-logic/armors'
import { QualityBadge } from '~/components/inventory/QualityBadge'
import { EffectTooltip } from '~/components/inventory/EffectTooltip'
import { lookupArmorMod } from '~/lib/game-logic/armor-mods'

interface EquippedArmorCardProps {
  entry: InventoryItem
  armor: ArmorData
  /** Override entry.currentDurability with a live value (e.g. optimistic in combat). */
  currentDurability?: number
  /** Optional combat-side affordances rendered in a footer row (durability stepper). */
  footer?: React.ReactNode
}

/**
 * Read-only block that surfaces every combat-relevant property of equipped
 * armor: primary/secondary soak (with broken-state highlight), durability,
 * qualities and special rules. Used both on the character sheet's Actions
 * tab and inside each combat-tracker participant card.
 */
export function EquippedArmorCard({
  entry,
  armor,
  currentDurability,
  footer,
}: EquippedArmorCardProps) {
  const tracksDurability = armor.durability != null
  const current =
    currentDurability ?? entry.currentDurability ?? armor.durability ?? 0
  const broken = tracksDurability && current <= 0
  const activeSoak = broken ? armor.secondarySoak : armor.primarySoak
  const mods = entry.mods ?? []

  return (
    <div className="rounded-lg border border-accent-700/40 bg-gray-100/40 p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-semibold text-white">{entry.name}</span>
        <span className="text-[10px] uppercase tracking-wide text-gray-700">
          {armor.type}
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
      {mods.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-gray-700">Mods:</span>
          {mods.map((name) => {
            const mod = lookupArmorMod(name)
            return (
              <EffectTooltip
                key={name}
                text={mod?.effects ?? 'Unknown mod.'}
              >
                <span className="cursor-help text-gray-1000 underline decoration-dotted underline-offset-2">
                  {name}
                </span>
              </EffectTooltip>
            )
          })}
        </div>
      )}
      {armor.specialRules && (
        <p className="mt-2 whitespace-pre-line text-xs text-gray-900">
          {armor.specialRules}
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
