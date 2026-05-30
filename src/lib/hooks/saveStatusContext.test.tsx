// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  SaveStatusProvider,
  useReportSave,
  useSaveStatus,
} from './saveStatusContext'

/**
 * Render both the reporter and the status reader against the same
 * provider so a test can drive begin/endSave and read the aggregated
 * status off a single hook result.
 */
function renderSaveStatus() {
  return renderHook(
    () => ({
      status: useSaveStatus(),
      ...useReportSave(),
    }),
    {
      wrapper: ({ children }) => (
        <SaveStatusProvider>{children}</SaveStatusProvider>
      ),
    },
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('SaveStatusProvider', () => {
  it('starts idle', () => {
    const { result } = renderSaveStatus()
    expect(result.current.status).toBe('idle')
  })

  it('returns idle from useSaveStatus when used outside a provider', () => {
    const { result } = renderHook(() => useSaveStatus())
    expect(result.current).toBe('idle')
  })

  it('flips to saving while a save is in flight and back to saved on success', () => {
    const { result } = renderSaveStatus()
    act(() => {
      result.current.beginSave()
    })
    expect(result.current.status).toBe('saving')
    act(() => {
      result.current.endSave('saved')
    })
    expect(result.current.status).toBe('saved')
  })

  it('stays in saving while overlapping saves are in flight', () => {
    const { result } = renderSaveStatus()
    act(() => {
      result.current.beginSave()
      result.current.beginSave()
    })
    expect(result.current.status).toBe('saving')
    // Only one of the two has finished — the wave is still active.
    act(() => {
      result.current.endSave('saved')
    })
    expect(result.current.status).toBe('saving')
    // Wave closes when the in-flight counter returns to zero.
    act(() => {
      result.current.endSave('saved')
    })
    expect(result.current.status).toBe('saved')
  })

  it('makes an error stick within a wave even when a sibling save succeeds later', () => {
    const { result } = renderSaveStatus()
    act(() => {
      result.current.beginSave()
      result.current.beginSave()
    })
    act(() => {
      result.current.endSave('error')
    })
    expect(result.current.status).toBe('saving')
    act(() => {
      result.current.endSave('saved')
    })
    // The sibling success doesn't whitewash the error in the same wave.
    expect(result.current.status).toBe('error')
  })

  it('keeps the error sticky when it lands last in the wave', () => {
    const { result } = renderSaveStatus()
    act(() => {
      result.current.beginSave()
      result.current.beginSave()
    })
    act(() => {
      result.current.endSave('saved')
    })
    act(() => {
      result.current.endSave('error')
    })
    expect(result.current.status).toBe('error')
  })

  it('clears a prior error when a fresh save wave begins', () => {
    const { result } = renderSaveStatus()
    act(() => {
      result.current.beginSave()
      result.current.endSave('error')
    })
    expect(result.current.status).toBe('error')
    // 0 → 1 in-flight starts a new wave; the prior outcome should not
    // shadow it.
    act(() => {
      result.current.beginSave()
    })
    expect(result.current.status).toBe('saving')
    act(() => {
      result.current.endSave('saved')
    })
    expect(result.current.status).toBe('saved')
  })

  it('auto-clears the saved status after 2s of quiet', () => {
    vi.useFakeTimers()
    const { result } = renderSaveStatus()
    act(() => {
      result.current.beginSave()
      result.current.endSave('saved')
    })
    expect(result.current.status).toBe('saved')
    act(() => {
      vi.advanceTimersByTime(1999)
    })
    expect(result.current.status).toBe('saved')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.status).toBe('idle')
  })

  it('does not auto-clear errors — they persist until the next wave', () => {
    vi.useFakeTimers()
    const { result } = renderSaveStatus()
    act(() => {
      result.current.beginSave()
      result.current.endSave('error')
    })
    expect(result.current.status).toBe('error')
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.status).toBe('error')
  })
})
