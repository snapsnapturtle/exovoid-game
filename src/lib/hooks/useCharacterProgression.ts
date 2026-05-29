import { useCallback, useEffect, useRef, useState } from 'react'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import { listProgression } from '~/lib/server/progression'
import type { ProgressionEntry } from '~/lib/types/database'

export interface UseCharacterProgressionResult {
  rows: ProgressionEntry[]
  /** False until the initial fetch resolves. Callers that derive a UI
   * affordance from the absence of rows (e.g. "no level-up committed
   * yet → show Level up button") must wait for this — otherwise the
   * button flickers in for one render on every fresh page load. */
  loaded: boolean
  /**
   * Push a row into the local cache synchronously — call this with the
   * row returned by `recordProgression` so the next `pendingLevelUp`
   * call sees the new entry without waiting for the realtime echo.
   * Idempotent on `id`; realtime de-dupes when it eventually arrives.
   */
  appendLocal: (row: ProgressionEntry) => void
  /** Same idea for updates. */
  upsertLocal: (row: ProgressionEntry) => void
  removeLocal: (id: string) => void
}

/**
 * Owns the progression-log feed for a character. Pass `initial` when the
 * caller already has the rows (e.g. from a route loader) — the hook
 * boots from that snapshot and skips the on-mount fetch. Without
 * `initial` it fetches on mount. In both cases postgres_changes
 * (INSERT/UPDATE/DELETE) keep the list current across tabs, GM edits,
 * and downtime/level-up writes from this client itself. Rows are
 * returned sorted by level then created_at — matching `listProgression`'s
 * order.
 */
export function useCharacterProgression(
  characterId: string,
  initial?: ProgressionEntry[],
): UseCharacterProgressionResult {
  const [rows, setRows] = useState<ProgressionEntry[]>(initial ?? [])
  const [loaded, setLoaded] = useState(initial !== undefined)
  // Capture once: did the caller hand us initial rows? Reading the prop
  // directly inside the effect below would either trip
  // react-hooks/exhaustive-deps or force a re-fetch every time the array
  // identity changes upstream (realtime, appendLocal). Stashing the
  // "had-initial" bit in a ref keeps the effect dependent only on
  // characterId.
  const hasInitialRef = useRef(initial !== undefined)

  useEffect(() => {
    if (hasInitialRef.current) return
    let cancelled = false
    setLoaded(false)
    void (async () => {
      try {
        const data = await listProgression({ data: { characterId } })
        if (!cancelled) {
          setRows(data)
          setLoaded(true)
        }
      } catch (e) {
        console.error('Failed to load progression', e)
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [characterId])

  useRealtimeSubscription<ProgressionEntry>({
    channel: `character_progression:${characterId}`,
    table: 'character_progression',
    event: '*',
    filter: `character_id=eq.${characterId}`,
    onChange: (payload) => {
      setRows((prev) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const incoming = payload.new as ProgressionEntry
          if (prev.some((r) => r.id === incoming.id)) return prev
          return sortRows([...prev, incoming])
        }
        if (payload.eventType === 'UPDATE' && payload.new) {
          const incoming = payload.new as ProgressionEntry
          return sortRows(
            prev.map((r) => (r.id === incoming.id ? incoming : r)),
          )
        }
        if (payload.eventType === 'DELETE' && payload.old) {
          const gone = payload.old as Partial<ProgressionEntry>
          return prev.filter((r) => r.id !== gone.id)
        }
        return prev
      })
    },
  })

  const appendLocal = useCallback((row: ProgressionEntry) => {
    setRows((prev) =>
      prev.some((r) => r.id === row.id) ? prev : sortRows([...prev, row]),
    )
  }, [])

  const upsertLocal = useCallback((row: ProgressionEntry) => {
    setRows((prev) => {
      if (prev.some((r) => r.id === row.id)) {
        return sortRows(prev.map((r) => (r.id === row.id ? row : r)))
      }
      return sortRows([...prev, row])
    })
  }, [])

  const removeLocal = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { rows, loaded, appendLocal, upsertLocal, removeLocal }
}

function sortRows(rows: ProgressionEntry[]): ProgressionEntry[] {
  return [...rows].sort(
    (a, b) => a.level - b.level || a.created_at.localeCompare(b.created_at),
  )
}
