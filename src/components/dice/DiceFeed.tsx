import { useEffect, useRef, useState } from 'react'
import { IconChevronUp } from '@tabler/icons-react'
import { CustomDiceRoller } from './CustomDiceRoller'
import { RollResultView } from './RollResultView'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Modal } from '~/components/ui/Modal'
import { removePendingSupport, type DiceRollEntry } from '~/lib/server/dice'
import type { PendingBonus, PendingSupport } from '~/lib/types/domain'

export interface PendingBonusEntry {
  characterId: string
  characterName: string
  bonus: PendingBonus
}

const TIME_TICK_MS = 15_000
const HIGHLIGHT_MS = 1800
const SCROLL_TOP_THRESHOLD_PX = 80

const SYMBOL_ORDER = [
  'botch',
  'success',
  'complication',
  'trigger',
  'xp',
  'wound',
  'minion',
  'cyberware',
  'adrenaline',
] as const

function orderSymbols(summary: Record<string, number>): string[] {
  return Object.keys(summary).sort((a, b) => {
    const ia = SYMBOL_ORDER.indexOf(a as (typeof SYMBOL_ORDER)[number])
    const ib = SYMBOL_ORDER.indexOf(b as (typeof SYMBOL_ORDER)[number])
    return (
      (ia === -1 ? SYMBOL_ORDER.length : ia) -
      (ib === -1 ? SYMBOL_ORDER.length : ib)
    )
  })
}

function relativeTime(iso: string, now: number): string {
  const t = new Date(iso).getTime()
  const diff = Math.max(0, now - t)
  const s = Math.floor(diff / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

interface DiceFeedProps {
  rolls: DiceRollEntry[]
  gameId: string
  myCharacters: { id: string; name: string }[]
  pendingSupport: PendingSupport[]
  pendingBonuses: PendingBonusEntry[]
  onRemoveBonus: (characterId: string, bonusId: string) => void
}

export function DiceFeed({
  rolls,
  gameId,
  myCharacters,
  pendingSupport,
  pendingBonuses,
  onRemoveBonus,
}: DiceFeedProps) {
  const [details, setDetails] = useState<DiceRollEntry | null>(null)
  const [highlighted, setHighlighted] = useState<Set<string>>(() => new Set())
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const seenIds = useRef<Set<string> | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const now = useNow(TIME_TICK_MS)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      setShowScrollTop(el.scrollTop > SCROLL_TOP_THRESHOLD_PX)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [rolls.length === 0])

  function scrollToTop() {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    // Skip the first run so existing rolls aren't all flashed on mount.
    if (seenIds.current === null) {
      seenIds.current = new Set(rolls.map((r) => r.id))
      return
    }
    const newIds = rolls
      .filter((r) => !seenIds.current!.has(r.id))
      .map((r) => r.id)
    seenIds.current = new Set(rolls.map((r) => r.id))

    if (newIds.length === 0) return

    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }

    setHighlighted((prev) => {
      const next = new Set(prev)
      newIds.forEach((id) => next.add(id))
      return next
    })
    const timer = setTimeout(() => {
      setHighlighted((prev) => {
        const next = new Set(prev)
        newIds.forEach((id) => next.delete(id))
        return next
      })
    }, HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [rolls])

  return (
    <>
      {/* A normal block in the page flow, sticky below the overlay header so it
          stays in view while the page scrolls under it. Bounded by max-h (the
          viewport minus the header and the top/bottom gaps) so its internal
          list scrolls. overflow-hidden clips the scroll-to-newest FAB when it's
          hidden — it animates out via translate-y, which would otherwise poke
          below the panel and add phantom page scroll. */}
      <aside className="sticky top-[calc(var(--app-header-h)+1.5rem)] mr-6 mt-6 flex max-h-[calc(100vh-var(--app-header-h)-3rem)] w-80 shrink-0 flex-col self-start overflow-hidden rounded-xl border border-gray-400 bg-background-100">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-400 bg-background-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Dice Feed</h3>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => setCustomOpen(true)}
            title="Custom roll"
          >
            + Custom
          </Button>
        </div>
        {pendingSupport.length > 0 && (
          <PendingSupportStrip
            gameId={gameId}
            pendingSupport={pendingSupport}
          />
        )}
        {pendingBonuses.length > 0 && (
          <PendingBonusesStrip
            pendingBonuses={pendingBonuses}
            onRemoveBonus={onRemoveBonus}
          />
        )}
        {rolls.length === 0 ? (
          <p className="flex-1 px-2 py-6 text-center text-sm text-gray-700">
            No rolls yet.
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
          >
            {rolls.map((roll) => (
              <RollCard
                key={roll.id}
                roll={roll}
                now={now}
                highlighted={highlighted.has(roll.id)}
                onClick={() => setDetails(roll)}
              />
            ))}
          </div>
        )}
        <button
          onClick={scrollToTop}
          aria-label="Scroll to newest"
          className={`elevation-float absolute bottom-3 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-accent-700 text-white transition-all duration-200 hover:bg-accent-800 ${
            showScrollTop
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-14 opacity-0'
          }`}
        >
          <IconChevronUp size={16} aria-hidden />
        </button>
      </aside>

      {details && (
        <RollDetails roll={details} onClose={() => setDetails(null)} />
      )}
      {customOpen && (
        <CustomDiceRoller
          gameId={gameId}
          characters={myCharacters}
          onClose={() => setCustomOpen(false)}
        />
      )}
    </>
  )
}

function RollCard({
  roll,
  now,
  highlighted,
  onClick,
}: {
  roll: DiceRollEntry
  now: number
  highlighted: boolean
  onClick: () => void
}) {
  const summary = roll.data.summary ?? {}
  const ordered = orderSymbols(summary)
  const label = roll.character_name ?? roll.player_name ?? 'Unknown'
  const skill = roll.skill_name ?? 'Custom roll'
  const modifier = roll.data.modifier ?? 0
  const isSupport = roll.data.kind === 'support'
  const isPoly = roll.data.kind === 'poly'
  const absorbedCount = roll.data.absorbedSupports?.length ?? 0

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border border-gray-400 bg-background-200 p-3 text-left transition hover:border-gray-500 hover:bg-gray-100 ${highlighted ? 'roll-flash' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2 text-xs text-gray-900">
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className="shrink-0 text-gray-700"
          title={new Date(roll.created_at).toLocaleString()}
        >
          {relativeTime(roll.created_at, now)}
        </span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5">
        <span className="font-medium text-white">{skill}</span>
        {isSupport && (
          <Badge tone="neutral" uppercase>
            Support
          </Badge>
        )}
        {absorbedCount > 0 && (
          <span className="text-xs text-accent-900">
            (+{absorbedCount} support)
          </span>
        )}
        {modifier !== 0 && (
          <span className="text-xs text-gray-700">
            ({modifier > 0 ? '+' : ''}
            {modifier})
          </span>
        )}
        {roll.is_hidden && (
          <Badge tone="warning" uppercase>
            Hidden
          </Badge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {isPoly ? (
          <PolyRollSummary data={roll.data} />
        ) : ordered.length === 0 ? (
          <span className="text-xs italic text-gray-700">Nothing</span>
        ) : (
          ordered.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-xs text-gray-1000"
            >
              <img
                src={`/img/symbols/${s}.png`}
                alt={s}
                width={16}
                height={16}
              />
              <span className="capitalize">{s}</span>
              <span className="text-gray-900">×{summary[s]}</span>
            </span>
          ))
        )}
      </div>
    </button>
  )
}

/** Compact numeric breakdown + total for a polyhedral roll in the feed. */
function PolyRollSummary({ data }: { data: DiceRollEntry['data'] }) {
  const dice = data.polyResult ?? []
  const total = data.polyTotal ?? dice.reduce((sum, d) => sum + d.value, 0)
  // Group consecutive (server-ordered) dice by type: "3d6 → 4, 2, 5".
  const groups: { type: string; values: number[] }[] = []
  for (const d of dice) {
    const last = groups[groups.length - 1]
    if (last && last.type === d.type) last.values.push(d.value)
    else groups.push({ type: d.type, values: [d.value] })
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-1000">
      {groups.map((g, i) => (
        <span key={i} className="text-gray-900">
          <span className="text-gray-1000">
            {g.values.length}
            {g.type}
          </span>{' '}
          <span className="tabular-nums">{g.values.join(', ')}</span>
        </span>
      ))}
      <span className="font-semibold tabular-nums text-white">= {total}</span>
    </div>
  )
}

function PendingSupportStrip({
  gameId,
  pendingSupport,
}: {
  gameId: string
  pendingSupport: PendingSupport[]
}) {
  const [busy, setBusy] = useState(false)

  async function handleRemove(supportId: string) {
    if (busy) return
    setBusy(true)
    try {
      await removePendingSupport({ data: { gameId, supportId } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shrink-0 border-b border-gray-400 bg-background-200 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-white">Supports</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {pendingSupport.map((s) => (
          <Badge
            key={s.id}
            tone="success"
            title={`${s.supporterName} — ${s.skillName}`}
            dismissLabel={`Discard ${s.supporterName}'s support for ${s.skillName}`}
            dismissDisabled={busy}
            onDismiss={() => handleRemove(s.id)}
          >
            <span className="truncate">
              <span className="font-medium">{s.supporterName}</span>
              <span> ({s.skillName})</span>
            </span>
          </Badge>
        ))}
      </div>
    </div>
  )
}

function PendingBonusesStrip({
  pendingBonuses,
  onRemoveBonus,
}: {
  pendingBonuses: PendingBonusEntry[]
  onRemoveBonus: (characterId: string, bonusId: string) => void
}) {
  return (
    <div className="shrink-0 border-b border-gray-400 bg-background-200 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-white">Bonuses</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {pendingBonuses.map(({ characterId, characterName, bonus }) => (
          <Badge
            key={bonus.id}
            tone={bonus.modifier >= 0 ? 'success' : 'danger'}
            title={`${characterName} — persisted from ${bonus.source}. Removes on next roll.`}
            dismissLabel={`Remove ${bonus.label} from ${characterName}`}
            onDismiss={() => onRemoveBonus(characterId, bonus.id)}
          >
            <span className="font-semibold tabular-nums">
              {bonus.modifier > 0 ? `+${bonus.modifier}` : bonus.modifier}
            </span>
            <span>{bonus.label}</span>
          </Badge>
        ))}
      </div>
    </div>
  )
}

function RollDetails({
  roll,
  onClose,
}: {
  roll: DiceRollEntry
  onClose: () => void
}) {
  const label = roll.character_name ?? roll.player_name ?? 'Unknown'
  const skill = roll.skill_name ?? 'Custom roll'

  return (
    <Modal
      onClose={onClose}
      size="sm"
      align="center"
      title={
        <>
          {label} <span className="text-gray-900">· {skill}</span>
        </>
      }
    >
      <RollResultView data={roll.data} animate={false} />
    </Modal>
  )
}
