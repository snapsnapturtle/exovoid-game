import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SaveStatusContextValue {
  status: SaveStatus
  beginSave: () => void
  endSave: (outcome: 'saved' | 'error') => void
}

const SaveStatusContext = createContext<SaveStatusContextValue | null>(null)

const SAVED_AUTO_CLEAR_MS = 2000

/**
 * Aggregates save activity across every reporting hook (useCharacter,
 * useDebouncedNumber, …) into a single status the app header can render.
 *
 * Wave model: a save "wave" starts when in-flight goes 0→1 and ends
 * when it returns to 0. Within a wave, an error sticks (a sibling save
 * succeeding later doesn't whitewash a failure). Across waves, a fresh
 * 'saving' clears the prior outcome so a new attempt isn't visually
 * shadowed by stale state.
 */
export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [inFlight, setInFlight] = useState(0)
  const [lastOutcome, setLastOutcome] = useState<'saved' | 'error' | null>(
    null,
  )

  const beginSave = useCallback(() => {
    setInFlight((c) => {
      if (c === 0) setLastOutcome(null)
      return c + 1
    })
  }, [])

  const endSave = useCallback((outcome: 'saved' | 'error') => {
    setInFlight((c) => Math.max(0, c - 1))
    setLastOutcome((prev) => {
      if (outcome === 'error') return 'error'
      if (prev === 'error') return 'error'
      return 'saved'
    })
  }, [])

  const status: SaveStatus =
    inFlight > 0
      ? 'saving'
      : lastOutcome === 'error'
        ? 'error'
        : lastOutcome === 'saved'
          ? 'saved'
          : 'idle'

  // 'saved' auto-clears after 2s of quiet. Errors persist until the next
  // wave or page navigation — they're intentionally sticky.
  useEffect(() => {
    if (status !== 'saved') return
    const id = setTimeout(() => setLastOutcome(null), SAVED_AUTO_CLEAR_MS)
    return () => clearTimeout(id)
  }, [status])

  return (
    <SaveStatusContext.Provider value={{ status, beginSave, endSave }}>
      {children}
    </SaveStatusContext.Provider>
  )
}

/** Read the aggregate status for rendering (header chip, etc.). */
export function useSaveStatus(): SaveStatus {
  return useContext(SaveStatusContext)?.status ?? 'idle'
}

/**
 * Stable begin/end callbacks for save sources to publish into the
 * aggregate. Returns no-ops outside a provider so the hooks that
 * auto-wire (useCharacter, useDebouncedNumber) stay safe to use
 * anywhere — e.g. in tests, or in screens without a header.
 */
export function useReportSave(): {
  beginSave: () => void
  endSave: (outcome: 'saved' | 'error') => void
} {
  const ctx = useContext(SaveStatusContext)
  if (!ctx) return NOOP_REPORTERS
  return { beginSave: ctx.beginSave, endSave: ctx.endSave }
}

const NOOP_REPORTERS = {
  beginSave: () => {},
  endSave: (_: 'saved' | 'error') => {},
}
