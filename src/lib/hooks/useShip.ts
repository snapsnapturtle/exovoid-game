import { useState, useEffect, useRef, useCallback } from 'react'
import type { Ship, ShipConfig, ShipDamage } from '~/lib/types/database'
import { updateShip } from '~/lib/server/ships'
import { useReportSave } from '~/lib/hooks/saveStatusContext'

const SAVE_DEBOUNCE_MS = 800

/**
 * Optimistic ship editing with debounced autosave — the useCharacter
 * pattern applied to the ships table. One snapshot ref, one debounce, one
 * batched save of every editable column. Last-write-wins between
 * concurrent editors, same as the character sheet; incoming realtime rows
 * only replace local state while no save is pending.
 */
export function useShip(initial: Ship) {
  const [ship, setShip] = useState(initial)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef(false)
  const { beginSave, endSave } = useReportSave()
  const beginSaveRef = useRef(beginSave)
  beginSaveRef.current = beginSave
  const endSaveRef = useRef(endSave)
  endSaveRef.current = endSave
  // Snapshot the debounced save persists. Written synchronously by every
  // mutator (before setState) so flushSave and the unmount cleanup never
  // read a stale value through React's deferred updates.
  const latestRef = useRef<Ship>(initial)

  // Adopt realtime/loader updates only while no local edit is in flight.
  useEffect(() => {
    if (!pendingRef.current) {
      setShip(initial)
      latestRef.current = initial
    }
  }, [initial])

  const performSave = useCallback(async () => {
    const snapshot = latestRef.current
    beginSaveRef.current()
    try {
      await updateShip({
        data: {
          shipId: snapshot.id,
          updates: {
            name: snapshot.name,
            visible_to_players: snapshot.visible_to_players,
            config: snapshot.config,
            damage: snapshot.damage,
            notes: snapshot.notes,
          },
        },
      })
      endSaveRef.current('saved')
      pendingRef.current = false
    } catch (err) {
      endSaveRef.current('error')
      pendingRef.current = false
      throw err
    }
  }, [])

  function markPending(next: Ship) {
    latestRef.current = next
    pendingRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      // Fire-and-forget — failures surface via the save-status chip.
      performSave().catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  }

  /** Cancel the debounce and persist immediately. No-op when clean. */
  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!pendingRef.current) return
    await performSave()
  }, [performSave])

  // Flush a stranded pending save when the user navigates away.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        if (pendingRef.current) {
          performSave().catch(() => {})
        }
      }
    }
  }, [performSave])

  function updateField<K extends keyof Ship>(key: K, value: Ship[K]) {
    const next: Ship = { ...latestRef.current, [key]: value }
    markPending(next)
    setShip(next)
  }

  function updateConfig(partial: Partial<ShipConfig>) {
    updateField('config', { ...latestRef.current.config, ...partial })
  }

  function updateDamage(partial: Partial<ShipDamage>) {
    updateField('damage', { ...latestRef.current.damage, ...partial })
  }

  return {
    ship,
    updateField,
    updateConfig,
    updateDamage,
    flushSave,
  }
}
