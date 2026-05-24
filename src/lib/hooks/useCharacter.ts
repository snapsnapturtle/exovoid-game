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

  // Reset when initial data changes (e.g., from realtime)
  useEffect(() => {
    if (!pendingRef.current) {
      setCharacter(initial)
    }
  }, [initial])

  const debouncedSave = useCallback(
    (updated: Character) => {
      if (!canEdit) return

      pendingRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          await updateCharacter({
            data: {
              characterId: updated.id,
              updates: {
                name: updated.name,
                career: updated.career,
                level: updated.level,
                experience: updated.experience,
                gender: updated.gender,
                age: updated.age,
                background_notes: updated.background_notes,
                attributes: updated.attributes,
                skills: updated.skills,
                talents: updated.talents,
                edge_current: updated.edge_current,
                health_current: updated.health_current,
                injuries: updated.injuries,
                pending_bonuses: updated.pending_bonuses,
                favorite_skills: updated.favorite_skills,
                notes: updated.notes,
                portrait_url: updated.portrait_url,
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
      }, SAVE_DEBOUNCE_MS)
    },
    [canEdit],
  )

  function updateField<K extends keyof Character>(key: K, value: Character[K]) {
    setCharacter((prev) => {
      let next: Character = { ...prev, [key]: value }
      if (key === 'experience') {
        next = { ...next, level: levelFromXp(next.experience) }
      }
      debouncedSave(next)
      return next
    })
  }

  function updateAttribute(attrId: keyof CharacterAttributes, value: number) {
    setCharacter((prev) => {
      const next = {
        ...prev,
        attributes: { ...prev.attributes, [attrId]: value },
      }
      debouncedSave(next)
      return next
    })
  }

  function updateSkill(skillId: string, value: number) {
    setCharacter((prev) => {
      const next = {
        ...prev,
        skills: { ...prev.skills, [skillId]: value },
      }
      debouncedSave(next)
      return next
    })
  }

  return {
    character,
    saveStatus,
    updateField,
    updateAttribute,
    updateSkill,
  }
}
