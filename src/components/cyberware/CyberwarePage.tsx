import { useEffect, useMemo, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import type { Character } from '~/lib/types/database'
import {
  canInstall,
  groupByCategory,
  occupationUsed,
  type CyberwareData,
} from '~/lib/game-logic/cyberware'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import {
  installCyberware,
  setMalfunctionAllocations,
  uninstallCyberware,
} from '~/lib/server/characters'
import { MalfunctionTableModal } from './MalfunctionTableModal'

interface CyberwarePageProps {
  initial: Character
  canEdit: boolean
}

export function CyberwarePage({ initial, canEdit }: CyberwarePageProps) {
  const router = useRouter()
  const [character, setCharacter] = useState<Character>(initial)
  const [busyName, setBusyName] = useState<string | null>(null)
  const [allocationsBusy, setAllocationsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showMalfunctionModal, setShowMalfunctionModal] = useState(false)

  useEffect(() => {
    setCharacter(initial)
  }, [initial])

  const groups = useMemo(() => groupByCategory(), [])
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    const out: { category: string; variants: CyberwareData[] }[] = []
    for (const g of groups) {
      if (g.category.toLowerCase().includes(q)) {
        out.push(g)
        continue
      }
      const matching = g.variants.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.tier.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q),
      )
      if (matching.length > 0) out.push({ category: g.category, variants: matching })
    }
    return out
  }, [groups, query])
  const capacity = useMemo(
    () =>
      applyPassiveEffects(
        character.attributes,
        character.talents,
        character.cyberware,
        character.inventory,
      ).derived.cyberImmunity,
    [
      character.attributes,
      character.talents,
      character.cyberware,
      character.inventory,
    ],
  )
  const used = useMemo(() => occupationUsed(character.cyberware), [character.cyberware])
  const installedByName = useMemo(
    () => new Map(character.cyberware.map((c) => [c.name, c])),
    [character.cyberware],
  )
  const installedCategories = useMemo(
    () => new Map(character.cyberware.map((c) => [c.category, c.name])),
    [character.cyberware],
  )

  async function handleInstall(name: string) {
    if (busyName) return
    setBusyName(name)
    setError(null)
    try {
      const updated = await installCyberware({
        data: { characterId: character.id, cyberwareName: name },
      })
      setCharacter(updated)
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to install cyberware')
    } finally {
      setBusyName(null)
    }
  }

  async function handleUninstall(name: string) {
    if (busyName) return
    setBusyName(name)
    setError(null)
    try {
      const updated = await uninstallCyberware({
        data: { characterId: character.id, cyberwareName: name },
      })
      setCharacter(updated)
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to uninstall cyberware')
    } finally {
      setBusyName(null)
    }
  }

  const overCapacity = used > capacity
  const excess = overCapacity ? used - capacity : 0
  const allocated = character.malfunction_allocations.length
  const allocationStatus: 'none' | 'complete' | 'partial' | 'stale' =
    excess === 0
      ? allocated === 0
        ? 'none'
        : 'stale'
      : allocated === excess
        ? 'complete'
        : 'partial'

  async function handleSaveAllocations(next: number[]) {
    if (allocationsBusy) return
    setAllocationsBusy(true)
    setError(null)
    try {
      const updated = await setMalfunctionAllocations({
        data: { characterId: character.id, allocations: next },
      })
      setCharacter(updated)
      setShowMalfunctionModal(false)
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save allocations')
    } finally {
      setAllocationsBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/games/$gameId/characters/$characterId"
            params={{ gameId: character.game_id, characterId: character.id }}
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← {character.name || 'Character'}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Cyberware</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OccupationBar used={used} capacity={capacity} over={overCapacity} />
          {(allocationStatus === 'partial' || allocationStatus === 'complete') &&
            canEdit && (
              <button
                onClick={() => setShowMalfunctionModal(true)}
                className={`text-xs font-medium transition ${
                  allocationStatus === 'partial'
                    ? 'text-warning-400 hover:text-warning-400/80'
                    : 'text-cyber-300 hover:text-cyber-200'
                }`}
              >
                {allocationStatus === 'partial'
                  ? `${allocated}/${excess} malfunction points allocated — allocate →`
                  : `Malfunction table allocated (${allocated} pts) — edit →`}
              </button>
            )}
          {allocationStatus === 'stale' && canEdit && (
            <button
              onClick={() => setShowMalfunctionModal(true)}
              className="text-xs font-medium text-warning-400 transition hover:text-warning-400/80"
            >
              {allocated} stale malfunction {allocated === 1 ? 'point' : 'points'} —
              clear →
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-danger-500/60 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </div>
      )}

      <SearchBox value={query} onChange={setQuery} />

      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-void-600 bg-void-800 p-6 text-center text-sm text-gray-500">
          No cyberware matches "{query}".
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredGroups.map((g) => (
            <CategoryCard
              key={g.category}
              category={g.category}
              variants={g.variants}
              installedName={installedCategories.get(g.category) ?? null}
              installedByName={installedByName}
              capacity={capacity}
              character={character}
              canEdit={canEdit}
              busyName={busyName}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
            />
          ))}
        </div>
      )}

      {showMalfunctionModal && (
        <MalfunctionTableModal
          excess={excess}
          allocations={character.malfunction_allocations}
          busy={allocationsBusy}
          onSave={handleSaveAllocations}
          onClose={() => setShowMalfunctionModal(false)}
        />
      )}
    </div>
  )
}

function SearchBox({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search cyberware — by category, name, tier, or description"
        className="w-full rounded-lg border border-void-600 bg-void-800 px-3 py-2 pl-9 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
      >
        ⌕
      </span>
    </div>
  )
}

function OccupationBar({
  used,
  capacity,
  over,
}: {
  used: number
  capacity: number
  over: boolean
}) {
  const pct = capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0
  const excess = over ? used - capacity : 0
  return (
    <div className="flex min-w-[220px] flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="whitespace-nowrap font-medium uppercase tracking-wide text-gray-400">
          Cyberimmunity
        </span>
        <span
          className={`whitespace-nowrap ${over ? 'text-warning-400' : 'text-gray-300'}`}
        >
          {used} / {capacity}
          {excess > 0 && (
            <span className="ml-1 text-warning-400">(+{excess} overload)</span>
          )}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-void-700">
        <div
          className={`h-full transition-all ${
            over ? 'bg-warning-500' : 'bg-accent-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function CategoryCard({
  category,
  variants,
  installedName,
  installedByName,
  capacity,
  character,
  canEdit,
  busyName,
  onInstall,
  onUninstall,
}: {
  category: string
  variants: CyberwareData[]
  installedName: string | null
  installedByName: Map<string, { name: string }>
  capacity: number
  character: Character
  canEdit: boolean
  busyName: string | null
  onInstall: (name: string) => void
  onUninstall: (name: string) => void
}) {
  return (
    <section className="rounded-xl border border-void-600 bg-void-800">
      <header className="flex items-baseline justify-between border-b border-void-700 px-4 py-3">
        <h2 className="text-lg font-semibold text-white">{category}</h2>
        {installedName && (
          <span className="text-xs text-cyber-300">
            Installed: <span className="font-medium">{installedName}</span>
          </span>
        )}
      </header>
      <div className="divide-y divide-void-700">
        {variants.map((v) => {
          const isInstalled = installedByName.has(v.name)
          const check = canInstall(character, v.name, capacity)
          return (
            <VariantRow
              key={v.name}
              variant={v}
              installed={isInstalled}
              replaces={check.replaces ?? null}
              disabledReason={check.ok ? null : check.reason ?? null}
              warning={check.warning ?? null}
              canEdit={canEdit}
              busy={busyName === v.name}
              onInstall={() => onInstall(v.name)}
              onUninstall={() => onUninstall(v.name)}
            />
          )
        })}
      </div>
    </section>
  )
}

const TIER_STYLES: Record<string, string> = {
  Alpha: 'border-void-500 bg-void-700 text-gray-300',
  Beta: 'border-accent-500/60 bg-accent-500/15 text-accent-200',
  Omega: 'border-cyber-500/60 bg-cyber-500/15 text-cyber-200',
}

function VariantRow({
  variant,
  installed,
  replaces,
  disabledReason,
  warning,
  canEdit,
  busy,
  onInstall,
  onUninstall,
}: {
  variant: CyberwareData
  installed: boolean
  replaces: string | null
  disabledReason: string | null
  warning: string | null
  canEdit: boolean
  busy: boolean
  onInstall: () => void
  onUninstall: () => void
}) {
  const tierClass = TIER_STYLES[variant.tier] ?? TIER_STYLES.Alpha
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tierClass}`}
          >
            {variant.tier}
          </span>
          <span className="font-medium text-white">{variant.name}</span>
          {installed && (
            <span className="inline-flex items-center gap-1 rounded-md border border-cyber-500/60 bg-cyber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyber-200">
              ✓ Installed
            </span>
          )}
        </div>
        <p className="whitespace-pre-line text-sm text-gray-300">
          {variant.description}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            <span className="font-medium text-gray-400">Occupation:</span>{' '}
            {variant.cyberImmunityCost}
          </span>
          <span>
            <span className="font-medium text-gray-400">Cost:</span>{' '}
            {variant.cost.toLocaleString()} ¢
          </span>
          <span>
            <span className="font-medium text-gray-400">Rarity:</span> {variant.rarity}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 sm:justify-center">
        {installed ? (
          canEdit && (
            <button
              onClick={onUninstall}
              disabled={busy}
              className="rounded-lg border border-void-600 bg-void-700 px-3 py-1.5 text-xs text-gray-300 transition hover:border-danger-500 hover:text-danger-300 disabled:opacity-50"
            >
              {busy ? 'Removing…' : 'Uninstall'}
            </button>
          )
        ) : (
          canEdit && (
            <>
              <button
                onClick={onInstall}
                disabled={busy || !!disabledReason}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                  warning
                    ? 'border-warning-500/60 bg-warning-500/15 text-warning-400 hover:bg-warning-500/25'
                    : 'border-accent-500/60 bg-accent-500/15 text-accent-200 hover:bg-accent-500/25'
                }`}
              >
                {busy ? 'Installing…' : replaces ? 'Replace' : 'Install'}
              </button>
              {replaces && !disabledReason && !warning && (
                <span className="max-w-[180px] text-right text-[10px] text-gray-500">
                  Replaces {replaces}
                </span>
              )}
              {warning && !disabledReason && replaces && (
                <span className="max-w-[200px] text-right text-[10px] text-gray-500">
                  Replaces {replaces}
                </span>
              )}
              {disabledReason && (
                <span className="max-w-[180px] text-right text-[10px] text-danger-400">
                  {disabledReason}
                </span>
              )}
            </>
          )
        )}
      </div>
    </div>
  )
}
