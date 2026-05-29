import { useState, useEffect, useRef, useCallback } from 'react'
import type { Character, CharacterAttributes } from '~/lib/types/database'
import { updateCharacter } from '~/lib/server/characters'
import { levelFromXp } from '~/lib/game-logic/leveling'

const SAVE_DEBOUNCE_MS = 800

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useCharacter(initial: Character, canEdit: boolean) {
  const [character, setCharacter] = useState(initial)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef(false)
  // Latest snapshot the debounced save needs to persist. Updated on every
  // `updateField`/`updateAttribute`/`updateSkill` so `flushSave()` can read
  // the current intent without re-deriving from a closure.
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
    setSaveStatus('saving')
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
      setSaveStatus('saved')
      pendingRef.current = false
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      pendingRef.current = false
    }
  }, [])

  const scheduleSave = useCallback(
    (updated: Character) => {
      if (!canEditRef.current) return
      latestRef.current = updated
      pendingRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        void performSave()
      }, SAVE_DEBOUNCE_MS)
    },
    [performSave],
  )

  /**
   * Cancel the pending debounce timer and persist `latestRef.current`
   * immediately. Returns a promise that resolves once the write
   * completes (or rejects on save error, but we currently swallow it
   * inside performSave to match the existing debounced behaviour —
   * resolve-only here). No-op when nothing is pending. Call this before
   * any UI flow that could navigate away or read back the character
   * row from the server (e.g. the level-up wizard's commit).
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
          void performSave()
        }
      }
    }
  }, [performSave])

  function updateField<K extends keyof Character>(key: K, value: Character[K]) {
    setCharacter((prev) => {
      let next: Character = { ...prev, [key]: value }
      if (key === 'experience') {
        next = { ...next, level: levelFromXp(next.experience) }
      }
      scheduleSave(next)
      return next
    })
  }

  function updateAttribute(attrId: keyof CharacterAttributes, value: number) {
    setCharacter((prev) => {
      const next = {
        ...prev,
        attributes: { ...prev.attributes, [attrId]: value },
      }
      scheduleSave(next)
      return next
    })
  }

  function updateSkill(skillId: string, value: number) {
    setCharacter((prev) => {
      const next = {
        ...prev,
        skills: { ...prev.skills, [skillId]: value },
      }
      scheduleSave(next)
      return next
    })
  }

  return {
    character,
    saveStatus,
    updateField,
    updateAttribute,
    updateSkill,
    flushSave,
  }
}
