import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { Character, ProgressionEntry } from '~/lib/types/database'
import {
  applyLevelUp,
  legalTalentsForLevelUp,
  skillPointsRemaining,
  type LevelUpPicks,
} from '~/lib/game-logic/level-up'
import { careersOfCharacter, type CareerData } from '~/lib/game-logic/talents'
import { recordProgression } from '~/lib/server/progression'
import { Modal } from '~/components/ui/Modal'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import careersData from '~/data/careers.json'
import talentsData from '~/data/talents.json'
import { LevelUpSkillsSection } from './LevelUpSkillsSection'
import { LevelUpTalentSection } from './LevelUpTalentSection'

const ALL_CAREERS = careersData as CareerData[]
const TALENT_DESCRIPTIONS = new Map(
  (talentsData as { name: string; description: string }[]).map((t) => [
    t.name,
    t.description,
  ]),
)

interface Props {
  character: Character
  /** The level being processed in this iteration of the wizard. */
  level: number
  onUpdateField: <K extends keyof Character>(
    key: K,
    value: Character[K],
  ) => void
  /** Force-flush the debounced save in `useCharacter` so the DB has the
   * new skills + talents before the user can navigate. Without this,
   * a quick click on the progression-history link after commit can race
   * the route loader and bring up stale data. */
  flushSave: () => Promise<void>
  /** Called with the row returned by `recordProgression` so the parent can
   * append it locally and recompute `pendingLevelUp` synchronously. */
  onCommitted: (row: ProgressionEntry) => void
  onClose: () => void
}

export function LevelUpModal({
  character,
  level,
  onUpdateField,
  flushSave,
  onCommitted,
  onClose,
}: Props) {
  const router = useRouter()
  const [skillDeltas, setSkillDeltas] = useState<Record<string, number>>({})
  const [talentPick, setTalentPick] = useState<LevelUpPicks['talent']>(null)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const legal = useMemo(() => {
    const careerNames = careersOfCharacter(character)
    const careers = careerNames
      .map((name) => ALL_CAREERS.find((c) => c.name === name))
      .filter((c): c is CareerData => Boolean(c))
    return legalTalentsForLevelUp(character, careers, TALENT_DESCRIPTIONS)
  }, [character])

  const noLegalTalents = legal.length === 0
  const remaining = skillPointsRemaining(character.skills, skillDeltas)
  const skillsResolved = remaining === 0
  const talentResolved = talentPick !== null || noLegalTalents
  const canCommit = skillsResolved && talentResolved && !committing

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

  async function commit() {
    if (!canCommit) return
    setCommitting(true)
    setError(null)
    try {
      const picks: LevelUpPicks = {
        skills: skillDeltas,
        talent: talentPick,
      }
      const { skills, talents } = applyLevelUp(character, level, picks)
      onUpdateField('skills', skills)
      onUpdateField('talents', talents)
      // Persist the new character snapshot synchronously — this commit is
      // explicit user intent, not the rapid +/- clicking pattern the
      // 800ms debounce was built for. Flush before recordProgression so
      // both writes land before the user can click a navigation link.
      await flushSave()
      const row = await recordProgression({
        data: {
          characterId: character.id,
          level,
          source: 'level-up',
          picks: picks as never,
        },
      })
      // Mark route loaders as stale so the parent character loader re-runs
      // on the next visit. Otherwise the cached loader data outlives the
      // commit and navigating /progression → /index returns the pre-commit
      // snapshot until a full page reload.
      void router.invalidate()
      onCommitted(row)
      // Close on every commit. Multi-level catch-up: the Level-up button
      // stays visible because the parent recomputes pendingLevelUp from
      // the appended row, and the player can re-open the wizard for the
      // next level when they're ready. One commit = one closed dialog.
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to commit level-up')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      size="lg"
      title={`Level up to ${level}`}
      subtitle="Spend +2 skill points and +1 talent point."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={commit} disabled={!canCommit}>
            {committing ? 'Saving…' : `Commit level ${level}`}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert variant="danger">{error}</Alert>}
        <LevelUpSkillsSection
          baseSkills={character.skills}
          deltas={skillDeltas}
          onAdjust={adjustSkill}
        />
        <div className="border-t border-gray-400" />
        <LevelUpTalentSection
          character={character}
          pick={talentPick}
          onPick={setTalentPick}
        />
      </div>
    </Modal>
  )
}
