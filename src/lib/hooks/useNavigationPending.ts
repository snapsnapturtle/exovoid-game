import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

interface UseNavigationPendingOptions {
  /**
   * Don't surface the loader until a navigation has been pending at least this
   * long. Quick navigations — preloaded on intent, or cache hits — resolve
   * inside this window and never trip it, so the loader appears only when a
   * load is genuinely slow. Default 150ms.
   */
  delay?: number
  /**
   * Once shown, keep it up at least this long so it can't blink out in a
   * single frame on a navigation that resolves just after `delay`. Default
   * 350ms.
   */
  minDuration?: number
}

/**
 * Whether to show a navigation-loading indicator. Reads the router's pending
 * status, but debounces it: returns `true` only after a navigation has been
 * in-flight longer than `delay`, and then for at least `minDuration`.
 *
 * The debounce is the whole point — with `defaultPreload: 'intent'` most
 * navigations resolve almost instantly, and flashing a loader on those reads
 * as jank. This keeps the indicator for the slow loads that actually warrant
 * one.
 */
export function useNavigationPending({
  delay = 150,
  minDuration = 350,
}: UseNavigationPendingOptions = {}): boolean {
  const isPending = useRouterState({
    select: (state) => state.status === 'pending',
  })
  const [visible, setVisible] = useState(false)
  // Timestamp (ms) the loader became visible, or null while it's hidden — used
  // to honour `minDuration` on the way out.
  const shownAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (isPending) {
      // Schedule the reveal; a navigation that settles before `delay` clears
      // this in cleanup and never shows anything.
      const showTimer = setTimeout(() => {
        shownAtRef.current = Date.now()
        setVisible(true)
      }, delay)
      return () => clearTimeout(showTimer)
    }

    // Navigation settled. If we never crossed `delay`, nothing was shown.
    if (shownAtRef.current === null) return
    const elapsed = Date.now() - shownAtRef.current
    const hideTimer = setTimeout(
      () => {
        shownAtRef.current = null
        setVisible(false)
      },
      Math.max(0, minDuration - elapsed),
    )
    return () => clearTimeout(hideTimer)
  }, [isPending, delay, minDuration])

  return visible
}
