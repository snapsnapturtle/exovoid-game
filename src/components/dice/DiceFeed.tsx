import { useEffect, useRef, useState } from 'react'
import { CustomDiceRoller } from './CustomDiceRoller'
import { RollResultView } from './RollResultView'
import { Modal } from '~/components/ui/Modal'
import type { DiceRollEntry } from '~/lib/server/dice'

const TIME_TICK_MS = 15_000
const HIGHLIGHT_MS = 2200
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
  currentUserId: string
  gameId: string
  isGm: boolean
  myCharacters: { id: string; name: string }[]
}

export function DiceFeed({
  rolls,
  currentUserId,
  gameId,
  isGm,
  myCharacters,
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
    const hasAnyNew = rolls.some((r) => !seenIds.current!.has(r.id))
    const newOwnIds = rolls
      .filter((r) => r.user_id === currentUserId && !seenIds.current!.has(r.id))
      .map((r) => r.id)
    seenIds.current = new Set(rolls.map((r) => r.id))

    if (hasAnyNew && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (newOwnIds.length === 0) return

    setHighlighted((prev) => {
      const next = new Set(prev)
      newOwnIds.forEach((id) => next.add(id))
      return next
    })
    const timer = setTimeout(() => {
      setHighlighted((prev) => {
        const next = new Set(prev)
        newOwnIds.forEach((id) => next.delete(id))
        return next
      })
    }, HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [rolls, currentUserId])

  return (
    <>
      <aside className="relative flex h-full w-80 shrink-0 flex-col border-l border-void-600 bg-void-900">
        <div className="flex shrink-0 items-center justify-between border-b border-void-600 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Dice Feed</h3>
          <button
            onClick={() => setCustomOpen(true)}
            title="Custom roll"
            className="rounded bg-accent-500/20 px-2 py-1 text-xs font-medium text-accent-400 transition hover:bg-accent-500/30"
          >
            + Custom
          </button>
        </div>
        {rolls.length === 0 ? (
          <p className="flex-1 px-2 py-6 text-center text-sm text-gray-500">
            No rolls yet.
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-2 overflow-y-auto p-3"
          >
            {rolls.map((roll) => (
              <RollCard
                key={roll.id}
                roll={roll}
                now={now}
                highlighted={highlighted.has(roll.id)}
                isOwn={roll.user_id === currentUserId}
                onClick={() => setDetails(roll)}
              />
            ))}
          </div>
        )}
        <button
          onClick={scrollToTop}
          aria-label="Scroll to newest"
          className={`absolute bottom-3 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-accent-500 text-white shadow-xl shadow-black/50 transition-all duration-200 hover:bg-accent-400 ${
            showScrollTop
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-14 opacity-0'
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 15 L12 8 L19 15" />
          </svg>
        </button>
      </aside>

      {details && (
        <RollDetails roll={details} onClose={() => setDetails(null)} />
      )}
      {customOpen && (
        <CustomDiceRoller
          gameId={gameId}
          characters={myCharacters}
          isGm={isGm}
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
  isOwn,
  onClick,
}: {
  roll: DiceRollEntry
  now: number
  highlighted: boolean
  isOwn: boolean
  onClick: () => void
}) {
  const summary = roll.data.summary ?? {}
  const ordered = orderSymbols(summary)
  const label = roll.character_name ?? roll.player_name ?? 'Unknown'
  const skill = roll.skill_name ?? 'Custom roll'
  const modifier = roll.data.modifier ?? 0

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border border-void-600 bg-void-800 p-3 text-left transition hover:border-accent-500 ${isOwn ? 'border-l-4 border-l-accent-500' : ''} ${highlighted ? 'roll-flash' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2 text-xs text-gray-400">
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className="shrink-0 text-gray-500"
          title={new Date(roll.created_at).toLocaleString()}
        >
          {relativeTime(roll.created_at, now)}
        </span>
      </div>
      <div className="mt-0.5">
        <span className="font-medium text-white">{skill}</span>
        {modifier !== 0 && (
          <span className="ml-1.5 text-xs text-gray-500">
            ({modifier > 0 ? '+' : ''}
            {modifier})
          </span>
        )}
        {roll.is_hidden && (
          <span className="ml-1.5 rounded bg-warning-500/20 px-1.5 py-0.5 text-[10px] text-warning-400">
            HIDDEN
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {ordered.length === 0 ? (
          <span className="text-xs text-gray-500">No symbols</span>
        ) : (
          ordered.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-xs text-gray-300"
            >
              <img
                src={`/img/symbols/${s}.png`}
                alt={s}
                width={16}
                height={16}
              />
              <span className="capitalize">{s}</span>
              <span className="text-gray-400">×{summary[s]}</span>
            </span>
          ))
        )}
      </div>
    </button>
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
          {label} <span className="text-gray-400">· {skill}</span>
        </>
      }
    >
      <RollResultView data={roll.data} animate={false} />
    </Modal>
  )
}
