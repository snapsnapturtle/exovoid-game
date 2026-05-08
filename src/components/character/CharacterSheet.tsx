import type { Character } from '~/lib/types/database'
import { useCharacter } from '~/lib/hooks/useCharacter'
import { computeAllDerivedStats } from '~/lib/game-logic/derived-stats'
import { CharacterHeader } from './CharacterHeader'
import { CharacterInfoPanel } from './CharacterInfoPanel'
import { AttributesPanel } from './AttributesPanel'
import { DerivedStatsPanel } from './DerivedStatsPanel'
import { SkillsPanel } from './SkillsPanel'

interface CharacterSheetProps {
  initial: Character
  canEdit: boolean
  isGm: boolean
}

export function CharacterSheet({
  initial,
  canEdit,
  isGm,
}: CharacterSheetProps) {
  const { character, saveStatus, updateField, updateAttribute, updateSkill } =
    useCharacter(initial, canEdit)

  const derivedStats = computeAllDerivedStats(character.attributes)

  return (
    <div className="space-y-6 p-6">
      <CharacterHeader
        name={character.name}
        career={character.career}
        level={character.level}
        experience={character.experience}
        saveStatus={saveStatus}
        canEdit={canEdit}
        onNameChange={(v) => updateField('name', v)}
        onCareerChange={(v) => updateField('career', v)}
      />

      <CharacterInfoPanel
        gender={character.gender}
        age={character.age}
        backgroundNotes={character.background_notes}
        canEdit={canEdit}
        onGenderChange={(v) => updateField('gender', v)}
        onAgeChange={(v) => updateField('age', v)}
        onBackgroundNotesChange={(v) => updateField('background_notes', v)}
      />

      <AttributesPanel
        attributes={character.attributes}
        canEdit={canEdit}
        onAttributeChange={updateAttribute}
      />

      <DerivedStatsPanel
        stats={derivedStats}
        healthCurrent={character.health_current}
        edgeCurrent={character.edge_current}
        canEdit={canEdit}
        onHealthChange={(v) => updateField('health_current', v)}
        onEdgeChange={(v) => updateField('edge_current', v)}
      />

      <SkillsPanel
        attributes={character.attributes}
        skills={character.skills}
        canEdit={canEdit}
        onSkillChange={updateSkill}
        gameId={character.game_id}
        characterId={character.id}
        isGm={isGm}
      />
    </div>
  )
}
