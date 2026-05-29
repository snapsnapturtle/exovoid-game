import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type {
  Character,
  ProgressionEntry,
  TalentEntry,
} from '~/lib/types/database'
import {
  type LevelUpPicks,
  legalTalentsForLevelUp,
} from '~/lib/game-logic/level-up'
import { careersOfCharacter, type CareerData } from '~/lib/game-logic/talents'
import careersData from '~/data/careers.json'
import talentsData from '~/data/talents.json'
import { updateCharacter } from '~/lib/server/characters'
import { updateProgression } from '~/lib/server/progression'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { LevelUpSkillsSection } from '../level-up/LevelUpSkillsSection'
import { LevelUpTalentSection } from '../level-up/LevelUpTalentSection'

const ALL_CAREERS = careersData as CareerData[]
const TALENT_DESCRIPTIONS = new Map(
  (talentsData as { name: string; description: string }[]).map((t) => [
    t.name,
    t.description,
  ]),
)

interface Props {
  entry: ProgressionEntry
  character: Character
  onCancel: () => void
  onSaved: (row: ProgressionEntry) => void
}

/**
 * Inline edit form for a level-up progression row. Computes a "base"
 * snapshot of the character *before* this row's effects, then drives
 * the same skills + talent sections the wizard uses against that base.
 *
 * On save: applies the diff (subtract old, add new) to character.skills
 * and character.talents via updateCharacter, then persists the new
 * picks payload via updateProgression. Atomic enough for our purposes —
 * if the second write fails we surface an error and leave the character
 * in the new state (the row hasn't been re-pointed yet, so the next
 * recompute treats the old picks as still in effect — visible drift
 * the player can correct).
 */
export function LevelUpEntryEdit({
  entry,
  character,
  onCancel,
  onSaved,
}: Props) {
  const router = useRouter()
  const oldPicks = entry.picks as unknown as LevelUpPicks
  // Reconstruct what skills + talents looked like BEFORE this row applied
  // — that's the base the editor needs so the user can pick a different
  // skill bump without the old one still being "spent."
  const baseSkills = useMemo(() => {
    const out = { ...character.skills }
    for (const [id, n] of Object.entries(oldPicks.skills)) {
      out[id] = Math.max(0, (out[id] ?? 0) - n)
    }
    return out
  }, [character.skills, oldPicks.skills])

  const baseTalents = useMemo<TalentEntry[]>(() => {
    if (!oldPicks.talent) return character.talents
    return character.talents.filter(
      (t) =>
        !(
          t.name === oldPicks.talent!.name &&
          t.career === oldPicks.talent!.career &&
          t.acquiredAt === entry.level
        ),
    )
  }, [character.talents, oldPicks.talent, entry.level])

  // Synthetic "base character" — what legalTalentsForLevelUp expects.
  const baseCharacter = useMemo<Character>(
    () => ({ ...character, skills: baseSkills, talents: baseTalents }),
    [character, baseSkills, baseTalents],
  )

  const [skillDeltas, setSkillDeltas] = useState<Record<string, number>>(
    oldPicks.skills,
  )
  const [talentPick, setTalentPick] = useState<LevelUpPicks['talent']>(
    oldPicks.talent,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const legal = useMemo(() => {
    const careerNames = careersOfCharacter(baseCharacter)
    const careers = careerNames
      .map((name) => ALL_CAREERS.find((c) => c.name === name))
      .filter((c): c is CareerData => Boolean(c))
    return legalTalentsForLevelUp(baseCharacter, careers, TALENT_DESCRIPTIONS)
  }, [baseCharacter])

  function adjustSkill(skillId: string, delta: 1 | -1) {
    setSkillDeltas((prev) => {
      const current = prev[skillId] ?? 0
      const next = current + delta
      const out = { ...prev }
      if (next <= 0) delete out[skillId]
      else out[skillId] = next
      return out
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      // Build new skills + talents starting from base, then apply new picks.
      const newSkills = { ...baseSkills }
      for (const [id, n] of Object.entries(skillDeltas)) {
        newSkills[id] = (newSkills[id] ?? 0) + n
      }
      const newTalents = [...baseTalents]
      if (talentPick) {
        newTalents.push({
          name: talentPick.name,
          career: talentPick.career,
          tier: talentPick.tier,
          acquiredAt: entry.level,
        })
      }
      const newPicks: LevelUpPicks = {
        skills: skillDeltas,
        talent: talentPick,
      }
      await updateCharacter({
        data: {
          characterId: character.id,
          updates: { skills: newSkills, talents: newTalents },
        },
      })
      const updatedRow = await updateProgression({
        data: { id: entry.id, picks: newPicks as never },
      })
      // Invalidate so the character route loader re-runs next time —
      // the cached snapshot here is the pre-edit version.
      void router.invalidate()
      onSaved(updatedRow)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save edit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="danger">{error}</Alert>}
      <LevelUpSkillsSection
        baseSkills={baseSkills}
        deltas={skillDeltas}
        onAdjust={adjustSkill}
      />
      <div className="border-t border-gray-400" />
      <LevelUpTalentSection
        character={baseCharacter}
        pick={talentPick}
        onPick={setTalentPick}
      />
      {talentPick &&
        !legal.some(
          (t) => t.name === talentPick.name && t.career === talentPick.career,
        ) && (
          <Alert variant="warning">
            The talent currently picked isn't legal under the reconstructed base
            — usually because another edit moved a tier prereq, or because the
            same talent was already unlocked elsewhere. Saving will leave it in
            place; clear the selection to bank this level's talent point
            instead.
          </Alert>
        )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
