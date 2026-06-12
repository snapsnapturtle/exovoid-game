// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Drive the router's pending status from the test. vi.hoisted shares this
// holder with the mock factory (which is hoisted above the imports); the
// real useRouterState subscribes to a store, but here we just re-read the
// holder on each render and trigger renders explicitly via rerender().
const router = vi.hoisted(() => ({ pending: false }))

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { status: 'pending' | 'idle' }) => unknown
  }) => select({ status: router.pending ? 'pending' : 'idle' }),
}))

import { useNavigationPending } from './useNavigationPending'

const DELAY = 150
const MIN = 350

describe('useNavigationPending', () => {
  beforeEach(() => {
    router.pending = false
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays hidden for navigations that resolve before the delay', () => {
    const { result, rerender } = renderHook(() => useNavigationPending())
    expect(result.current).toBe(false)

    // Navigation begins…
    router.pending = true
    rerender()
    act(() => {
      vi.advanceTimersByTime(DELAY - 50)
    })
    // …and resolves before the delay elapses.
    router.pending = false
    rerender()
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe(false)
  })

  it('shows once a navigation stays pending past the delay', () => {
    const { result, rerender } = renderHook(() => useNavigationPending())

    router.pending = true
    rerender()
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(DELAY)
    })
    expect(result.current).toBe(true)
  })

  it('stays visible for at least the minimum duration after showing', () => {
    const { result, rerender } = renderHook(() => useNavigationPending())

    router.pending = true
    rerender()
    act(() => {
      vi.advanceTimersByTime(DELAY)
    })
    expect(result.current).toBe(true)

    // Navigation completes right after the bar appeared.
    router.pending = false
    rerender()
    act(() => {
      vi.advanceTimersByTime(MIN - 100)
    })
    expect(result.current).toBe(true) // min-duration not yet elapsed

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(false)
  })

  it('cancels a pending hide when a new navigation starts', () => {
    const { result, rerender } = renderHook(() => useNavigationPending())

    router.pending = true
    rerender()
    act(() => {
      vi.advanceTimersByTime(DELAY)
    })
    expect(result.current).toBe(true)

    // Completes, scheduling a hide…
    router.pending = false
    rerender()
    act(() => {
      vi.advanceTimersByTime(100)
    })
    // …but a new navigation starts before the hide fires.
    router.pending = true
    rerender()
    act(() => {
      vi.advanceTimersByTime(MIN)
    })

    // The hide was cancelled; the bar is still up for the new navigation.
    expect(result.current).toBe(true)
  })
})
