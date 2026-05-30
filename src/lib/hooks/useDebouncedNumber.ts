import { useCallback, useEffect, useRef, useState } from 'react'
import { useReportSave } from '~/lib/hooks/saveStatusContext'

interface UseDebouncedNumberOptions {
  /** Server value — refreshes the local state when no save is pending. */
  initial: number
  /** Called after `delay` ms of inactivity with the final value. */
  save: (value: number) => Promise<unknown>
  delay?: number
  /** When false, `update` is a no-op (used for read-only viewers). */
  canEdit?: boolean
  /** Surfaced if `save` throws so the parent can render an Alert. */
  onError?: (error: unknown) => void
}

/**
 * Optimistic local state + debounced save for a single numeric field.
 *
 * Used in the combat page to keep Health/Edge/Ammo/Durability snappy
 * while collapsing rapid +/- clicks into one server roundtrip. Mirrors
 * the optimistic/debounce pattern in `useCharacter`, but at field-level
 * granularity so multiple participants and inventory items can each
 * have their own pending state without blocking the others.
 *
 * Reset behaviour: the local value re-syncs from `initial` only when no
 * save is pending. An incoming realtime update during a debounce
 * window therefore won't clobber the user's in-flight change.
 */
export function useDebouncedNumber({
  initial,
  save,
  delay = 800,
  canEdit = true,
  onError,
}: UseDebouncedNumberOptions): readonly [number, (value: number) => void] {
  const [value, setValue] = useState(initial)
  const pendingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep callbacks in refs so the returned `update` stays stable across
  // re-renders even when the parent inlines its save/onError functions.
  const saveRef = useRef(save)
  saveRef.current = save
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const { beginSave, endSave } = useReportSave()
  const beginSaveRef = useRef(beginSave)
  beginSaveRef.current = beginSave
  const endSaveRef = useRef(endSave)
  endSaveRef.current = endSave

  useEffect(() => {
    if (!pendingRef.current) setValue(initial)
  }, [initial])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const update = useCallback(
    (next: number) => {
      if (!canEdit) return
      setValue(next)
      pendingRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        beginSaveRef.current()
        try {
          await saveRef.current(next)
          endSaveRef.current('saved')
        } catch (e) {
          endSaveRef.current('error')
          onErrorRef.current?.(e)
        } finally {
          pendingRef.current = false
        }
      }, delay)
    },
    [canEdit, delay],
  )

  return [value, update] as const
}
