import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character } from '~/lib/types/database'
import { updateCharacter } from '~/lib/server/characters'
import { levelFromXp } from '~/lib/game-logic/leveling'
import { useReportSave } from '~/lib/hooks/saveStatusContext'

const SAVE_DEBOUNCE_MS = 800

export function useCharacter(initial: Character, canEdit: boolean) {
  const [character, setCharacter] = useState(initial)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef(false)
  const { beginSave, endSave } = useReportSave()
  // Refs let performSave (memoized once) read the current reporters
  // without invalidating the callback's identity on every render.
  const beginSaveRef = useRef(beginSave)
  beginSaveRef.current = beginSave
  const endSaveRef = useRef(endSave)
  endSaveRef.current = endSave
  // Snapshot the debounced save needs to persist. Kept in lockstep with
  // `character` via synchronous writes in every mutator below — flushSave
  // and the unmount cleanup both read this without going through a
  // setState updater (which React may defer until after the next await).
  const latestRef = useRef<Character>(initial)
  const canEditRef = useRef(canEdit)
  canEditRef.current = canEdit

  // Reset when initial data changes (e.g., from realtime)
  useEffect(() => {
    if (!pendingRef.current) {
      setCharacter(initial)
      latestRef.current = initial
    }
  }, [initial])

  const performSave = useCallback(async () => {
    if (!canEditRef.current) {
      pendingRef.current = false
      return
    }
    const snapshot = latestRef.current
    beginSaveRef.current()
    try {
      await updateCharacter({
        data: {
          characterId: snapshot.id,
          updates: {
            name: snapshot.name,
            career: snapshot.career,
            level: snapshot.level,
            experience: snapshot.experience,
            gender: snapshot.gender,
            age: snapshot.age,
            background_notes: snapshot.background_notes,
            attributes: snapshot.attributes,
            skills: snapshot.skills,
            talents: snapshot.talents,
            edge_current: snapshot.edge_current,
            health_current: snapshot.health_current,
            injuries: snapshot.injuries,
            pending_bonuses: snapshot.pending_bonuses,
            favorite_skills: snapshot.favorite_skills,
            notes: snapshot.notes,
            portrait_url: snapshot.portrait_url,
            downtime_uses_used: snapshot.downtime_uses_used,
          },
        },
      })
      endSaveRef.current('saved')
      pendingRef.current = false
    } catch (err) {
      // Clear pendingRef so the next mutation can schedule a fresh
      // save, and re-throw so awaited callers (notably `flushSave`,
      // used by the level-up wizard) can branch on the failure —
      // without this, the wizard would happily `recordProgression(...)`
      // a row whose picks were never actually persisted to the
      // character row, creating permanent log drift.
      endSaveRef.current('error')
      pendingRef.current = false
      throw err
    }
  }, [])

  /**
   * Sync portion of every mutator: writes `latestRef`, flips
   * `pendingRef`, and arms the debounce timer. Called BEFORE setCharacter
   * so refs are valid the instant the mutator returns — the level-up
   * wizard does `onUpdateField(...); await flushSave()` and the second
   * call would see stale refs if the work happened inside a setState
   * updater that React defers across the await boundary.
   */
  function markPending(next: Character) {
    latestRef.current = next
    if (!canEditRef.current) return
    pendingRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      // Fire-and-forget — performSave already reports the failure to
      // the save-status context. The catch keeps the rejection out of
      // the unhandled-promise channel; awaited callers (flushSave)
      // still see the rejection because they don't go through this path.
      performSave().catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  }

  /**
   * Cancel the pending debounce timer and persist `latestRef.current`
   * immediately. Rejects on save failure — callers that gate follow-up
   * work on persistence (e.g. the level-up wizard, which only writes
   * the progression row once the character save succeeds) must catch
   * this rejection. No-op when nothing is pending.
   */
  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!pendingRef.current) return
    await performSave()
  }, [performSave])

  // Flush on unmount so a pending save isn't stranded when the user
  // navigates away. The timer's setTimeout fires regardless of unmount
  // but the loader on the destination route may run first; flushing
  // here closes that window for the common case.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        if (pendingRef.current) {
          // Same fire-and-forget pattern as the debounce timer above —
          // the failure surfaces via the save-status context, not via
          // an unhandled rejection.
          performSave().catch(() => {})
        }
      }
    }
  }, [performSave])

  function updateField<K extends keyof Character>(key: K, value: Character[K]) {
    let next: Character = { ...latestRef.current, [key]: value }
    if (key === 'experience') {
      next = { ...next, level: levelFromXp(next.experience) }
    }
    markPending(next)
    setCharacter(next)
  }

  return {
    character,
    updateField,
    flushSave,
  }
}
