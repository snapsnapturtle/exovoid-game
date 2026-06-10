import { Alert } from '~/components/ui/Alert'
import {
  formatShipNumber,
  type ShipDerivedStats,
  type ShipStatBlock,
  type ShipWarning,
} from '~/lib/game-logic/ships'

interface ShipStatsPanelProps {
  stats: ShipDerivedStats
  warnings: ShipWarning[]
}

/** Right-rail summary: asset cost, capacity bar, power balance, the six
 * stat blocks and the shield line — all recomputed live from the config. */
export function ShipStatsPanel({ stats, warnings }: ShipStatsPanelProps) {
  const overCapacity = stats.capacityRemaining < 0
  const capacityPct = Math.min(
    100,
    (stats.capacityUsed / stats.capacityTotal) * 100,
  )

  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-white">Ship stats</h3>
        <p className="text-xs text-gray-700">
          {stats.shipClass.shipClass} · size {stats.shipClass.sizeClass} ·
          bridge {stats.shipClass.bridgeSize}
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-gray-400 bg-background-100/40 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-700">
          Total asset cost
        </p>
        <p className="text-2xl font-semibold text-white">
          {formatShipNumber(stats.totalAssetCost)}
          <span className="ml-1.5 text-sm font-normal text-gray-700">
            assets
          </span>
        </p>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium uppercase tracking-wide text-gray-700">
            Capacity
          </span>
          <span className={overCapacity ? 'text-warning-900' : 'text-gray-900'}>
            {formatShipNumber(stats.capacityUsed)} /{' '}
            {formatShipNumber(stats.capacityTotal)}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full ${overCapacity ? 'bg-warning-700' : 'bg-accent-700'}`}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between text-xs">
        <span className="font-medium uppercase tracking-wide text-gray-700">
          Power balance
        </span>
        <span
          className={
            stats.powerBalance < 0 ? 'text-warning-900' : 'text-success-900'
          }
        >
          {stats.powerBalance >= 0 ? '+' : ''}
          {formatShipNumber(stats.powerBalance)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-gray-400 pt-3">
        <StatRow label="Speed" stat={stats.speed} />
        <StatRow label="Maneuverability" stat={stats.maneuverability} />
        <StatRow label="Hull" stat={stats.hullMax} />
        <StatRow label="Armor durability" stat={stats.armorMax} />
        <StatRow label="Primary soak" stat={stats.primarySoak} />
        <StatRow label="Secondary soak" stat={stats.secondarySoak} />
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-gray-900">Shields</dt>
          <dd
            className="text-sm font-medium text-white"
            title={
              stats.shield
                ? `${stats.shield.source} — regenerates ${stats.shield.regenPct}% per round`
                : undefined
            }
          >
            {stats.shield ? stats.shield.points : '—'}
            {stats.shield && (
              <span className="ml-1 text-xs font-normal text-gray-700">
                {stats.shield.regenPct}%/rd
              </span>
            )}
          </dd>
        </div>
        {stats.malfunctionModifier > 0 && (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-xs text-gray-900">Malfunction rolls</dt>
            <dd className="text-sm font-medium text-warning-900">
              +{stats.malfunctionModifier}
            </dd>
          </div>
        )}
      </dl>

      {warnings.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-400 pt-3">
          {warnings.map((w, i) => (
            <Alert key={i} variant={w.severity}>
              {w.message}
            </Alert>
          ))}
        </div>
      )}
    </div>
  )
}

function StatRow({ label, stat }: { label: string; stat: ShipStatBlock }) {
  const modified = stat.total !== stat.base
  const breakdown = modified
    ? stat.contributions
        .map((c) => `${c.source}: ${c.value >= 0 ? '+' : ''}${c.value}`)
        .join('\n')
    : undefined
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-gray-900">{label}</dt>
      <dd
        className={`text-sm font-medium ${modified ? 'text-accent-900' : 'text-white'}`}
        title={breakdown}
      >
        {stat.total}
      </dd>
    </div>
  )
}
