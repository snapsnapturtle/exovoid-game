import { useMemo } from 'react'
import type { Character } from '~/lib/types/database'
import careersData from '~/data/careers.json'
import talentsData from '~/data/talents.json'
import { careersOfCharacter, type CareerData } from '~/lib/game-logic/talents'
import { Alert } from '~/components/ui/Alert'
import { TalentTreeCareer } from './TalentTreeCareer'
import { legalTalentsForLevelUp } from '~/lib/game-logic/level-up'

const ALL_CAREERS = careersData as CareerData[]
const TALENT_DESCRIPTIONS = new Map(
  (talentsData as { name: string; description: string }[]).map((t) => [
    t.name,
    t.description,
  ]),
)

interface Props {
  character: Character
  pick: { name: string; career: string; tier: number } | null
  onPick: (
    choice: { name: string; career: string; tier: number } | null,
  ) => void
}

/**
 * Tree-style talent picker for the level-up wizard. Renders each of the
 * character's careers as a separate `<TalentTreeCareer>` panel with
 * tier rows; clicking an `available` node sets the pick. Same chrome as
 * the previous standalone `/talents` page.
 */
export function LevelUpTalentSection({ character, pick, onPick }: Props) {
  const careers = useMemo(() => {
    const careerNames = careersOfCharacter(character)
    return careerNames
      .map((name) => ALL_CAREERS.find((c) => c.name === name))
      .filter((c): c is CareerData => Boolean(c))
  }, [character])

  // Banner gate: any legal pick anywhere in the character's career(s)?
  const anyLegal = useMemo(
    () =>
      legalTalentsForLevelUp(character, careers, TALENT_DESCRIPTIONS).length >
      0,
    [character, careers],
  )

  function handleSelect(name: string, career: string, tier: number) {
    // Clicking the currently-selected node clears the selection (toggle).
    if (pick && pick.name === name && pick.career === career) {
      onPick(null)
      return
    }
    onPick({ name, career, tier })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Talent point
        </h4>
        {pick && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="text-xs text-gray-900 transition hover:text-white"
          >
            Clear selection
          </button>
        )}
      </div>

      {!anyLegal && (
        <Alert variant="info">
          No legal talents at any reachable tier in your career — the talent
          point will bank for next level.
        </Alert>
      )}

      {careers.length === 0 ? (
        <Alert variant="warning">
          No career assigned to this character. Set a career on the sheet to
          enable talent picks.
        </Alert>
      ) : (
        <div className="space-y-3">
          {careers.map((career) => (
            <TalentTreeCareer
              key={career.name}
              career={career}
              talents={character.talents}
              selectedTalent={pick}
              descriptionByName={TALENT_DESCRIPTIONS}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </section>
  )
}
