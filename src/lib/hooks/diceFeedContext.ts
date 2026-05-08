import { createContext, useContext } from 'react'

interface DiceFeedContextValue {
  refresh: () => Promise<void>
  broadcastNewRoll: () => void
}

export const DiceFeedContext = createContext<DiceFeedContextValue | null>(null)

export function useDiceFeedRefresh(): () => Promise<void> {
  const ctx = useContext(DiceFeedContext)
  return ctx?.refresh ?? (() => Promise.resolve())
}

export function useDiceFeedBroadcast(): () => void {
  const ctx = useContext(DiceFeedContext)
  return ctx?.broadcastNewRoll ?? (() => {})
}
