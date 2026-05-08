import { useEffect, useRef, useState } from 'react'
import { Die } from './Die'
import type { DiceRollEntry } from '~/lib/server/dice'
import type { DieType } from '~/lib/game-logic/dice'

const TIME_TICK_MS = 15_000
const HIGHLIGHT_MS = 2200

const SYMBOL_ORDER = [
  'success',
  'trigger',
  'complication',
  'botch',
  'wound',
  'minion',
  'cyberware',
  'adrenaline',
  'xp',
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
}

export function DiceFeed({ rolls, currentUserId }: DiceFeedProps) {
  const [details, setDetails] = useState<DiceRollEntry | null>(null)
  const [highlighted, setHighlighted] = useState<Set<string>>(() => new Set())
  const seenIds = useRef<Set<string> | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const now = useNow(TIME_TICK_MS)

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
      <aside className="flex h-full w-80 shrink-0 flex-col border-l border-void-600 bg-void-900">
        <div className="shrink-0 border-b border-void-600 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Dice Feed</h3>
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
      </aside>

      {details && (
        <RollDetails roll={details} onClose={() => setDetails(null)} />
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
  const dice = roll.data.result ?? []
  const label = roll.character_name ?? roll.player_name ?? 'Unknown'
  const skill = roll.skill_name ?? 'Custom roll'

  // Group dice by type for display
  const grouped: Record<string, typeof dice> = {}
  dice.forEach((d) => {
    grouped[d.type] ??= []
    grouped[d.type].push(d)
  })
  const typeOrder: DieType[] = ['standard', 'aptitude', 'expertise', 'injury']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-void-600 bg-void-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">
            {label} <span className="text-gray-400">· {skill}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>
        {typeOrder.map((t) =>
          grouped[t]?.length ? (
            <div key={t} className="mb-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                {t}
              </p>
              <div className="flex flex-wrap gap-2">
                {grouped[t].map((d, i) => (
                  <Die
                    key={i}
                    type={d.type}
                    symbols={d.symbols}
                    exploded={d.exploded}
                    size="md"
                  />
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}
