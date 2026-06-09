import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
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
import { Alert } from '~/components/ui/Alert'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'

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
      if (matching.length > 0)
        out.push({ category: g.category, variants: matching })
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
        character.derived_stat_bonuses,
      ).derived.cyberImmunity,
    [
      character.attributes,
      character.talents,
      character.cyberware,
      character.inventory,
      character.derived_stat_bonuses,
    ],
  )
  const used = useMemo(
    () => occupationUsed(character.cyberware),
    [character.cyberware],
  )
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Cyberware</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OccupationBar used={used} capacity={capacity} over={overCapacity} />
          {(allocationStatus === 'partial' ||
            allocationStatus === 'complete') &&
            canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMalfunctionModal(true)}
                className="gap-1.5"
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    allocationStatus === 'partial'
                      ? 'bg-warning-700'
                      : 'bg-accent-700'
                  }`}
                  aria-hidden
                />
                {allocationStatus === 'partial'
                  ? `Allocate malfunctions (${allocated}/${excess})`
                  : 'Edit malfunctions'}
              </Button>
            )}
          {allocationStatus === 'stale' && canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMalfunctionModal(true)}
              className="gap-1.5"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-warning-700"
                aria-hidden
              />
              Clear stale ({allocated})
            </Button>
          )}
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      <SearchBox value={query} onChange={setQuery} />

      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-gray-400 bg-background-200 p-6 text-center text-sm text-gray-700">
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
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search cyberware — by category, name, tier, or description"
      className="w-full"
    />
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
        <span className="whitespace-nowrap font-medium uppercase tracking-wide text-gray-900">
          Cyberimmunity
        </span>
        <span
          className={`whitespace-nowrap ${over ? 'text-warning-900' : 'text-gray-1000'}`}
        >
          {used} / {capacity}
          {excess > 0 && (
            <span className="ml-1 text-warning-900">(+{excess} overload)</span>
          )}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full transition-all ${
            over ? 'bg-warning-700' : 'bg-accent-700'
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
    <section className="rounded-xl border border-gray-400 bg-background-200">
      <header className="flex items-baseline justify-between border-b border-gray-400 px-4 py-3">
        <h2 className="text-lg font-semibold text-white">{category}</h2>
        {installedName && (
          <span className="text-xs text-accent-900">
            Installed: <span className="font-medium">{installedName}</span>
          </span>
        )}
      </header>
      <div className="divide-y divide-gray-100">
        {variants.map((v) => {
          const isInstalled = installedByName.has(v.name)
          const check = canInstall(character, v.name, capacity)
          return (
            <VariantRow
              key={v.name}
              variant={v}
              installed={isInstalled}
              replaces={check.replaces ?? null}
              disabledReason={check.ok ? null : (check.reason ?? null)}
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

function VariantRow({
  variant,
  installed,
  replaces,
  disabledReason,
  canEdit,
  busy,
  onInstall,
  onUninstall,
}: {
  variant: CyberwareData
  installed: boolean
  replaces: string | null
  disabledReason: string | null
  canEdit: boolean
  busy: boolean
  onInstall: () => void
  onUninstall: () => void
}) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge tone="neutral" uppercase>
            {variant.tier}
          </Badge>
          <span className="font-medium text-white">{variant.name}</span>
        </div>
        <p className="whitespace-pre-line text-sm text-gray-1000">
          {variant.description}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
          <span>
            <span className="font-medium text-gray-900">Occupation:</span>{' '}
            {variant.cyberImmunityCost}
          </span>
          <span>
            <span className="font-medium text-gray-900">Cost:</span>{' '}
            {variant.cost.toLocaleString()} ¢
          </span>
          <span>
            <span className="font-medium text-gray-900">Rarity:</span>{' '}
            {variant.rarity}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 sm:justify-center">
        {installed
          ? canEdit && (
              <Button
                variant="danger"
                size="sm"
                onClick={onUninstall}
                disabled={busy}
              >
                {busy ? 'Removing…' : 'Uninstall'}
              </Button>
            )
          : canEdit && (
              <>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={onInstall}
                  disabled={busy || !!disabledReason}
                >
                  {busy ? 'Installing…' : replaces ? 'Replace' : 'Install'}
                </Button>
                {replaces && !disabledReason && (
                  <span className="max-w-[200px] text-right text-[10px] text-gray-700">
                    Replaces {replaces}
                  </span>
                )}
                {disabledReason && (
                  <span className="max-w-[180px] text-right text-[10px] text-danger-900">
                    {disabledReason}
                  </span>
                )}
              </>
            )}
      </div>
    </div>
  )
}
