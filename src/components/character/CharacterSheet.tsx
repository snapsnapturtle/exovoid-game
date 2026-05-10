import { useState } from 'react'
import type { Character } from '~/lib/types/database'
import { useCharacter } from '~/lib/hooks/useCharacter'
import { computeAllDerivedStats } from '~/lib/game-logic/derived-stats'
import { CharacterHeader } from './CharacterHeader'
import { AttributesPanel } from './AttributesPanel'
import { DerivedStatsPanel } from './DerivedStatsPanel'
import { LivePlayPanel } from './LivePlayPanel'
import { SkillsPanel } from './SkillsPanel'
import { EquipmentTabs } from './EquipmentTabs'
import { SaveStatusToast } from './SaveStatusToast'

interface CharacterSheetProps {
  initial: Character
  canEdit: boolean
  isGm: boolean
}

type SheetMode = 'play' | 'edit'

export function CharacterSheet({
  initial,
  canEdit,
  isGm,
}: CharacterSheetProps) {
  const [mode, setMode] = useState<SheetMode>('play')
  const { character, saveStatus, updateField, updateAttribute, updateSkill } =
    useCharacter(initial, canEdit)

  const derivedStats = computeAllDerivedStats(character.attributes)
  const isEditMode = mode === 'edit'
  const editScopeCanEdit = canEdit && isEditMode

  return (
    <div className="space-y-4 p-6">
      <CharacterHeader
        name={character.name}
        career={character.career}
        level={character.level}
        experience={character.experience}
        canEdit={editScopeCanEdit}
        showModeToggle={canEdit}
        isEditMode={isEditMode}
        onNameChange={(v) => updateField('name', v)}
        onCareerChange={(v) => updateField('career', v)}
        onExperienceChange={(v) => updateField('experience', v)}
        onModeToggle={() =>
          setMode((m) => (m === 'play' ? 'edit' : 'play'))
        }
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <AttributesPanel
          attributes={character.attributes}
          canEdit={editScopeCanEdit}
          onAttributeChange={updateAttribute}
        />
        <LivePlayPanel
          healthMax={derivedStats.health}
          healthCurrent={character.health_current}
          edgeMax={derivedStats.edge}
          edgeCurrent={character.edge_current}
          canEdit={canEdit}
          onHealthChange={(v) => updateField('health_current', v)}
          onEdgeChange={(v) => updateField('edge_current', v)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkillsPanel
          attributes={character.attributes}
          skills={character.skills}
          canEdit={editScopeCanEdit}
          onSkillChange={updateSkill}
          gameId={character.game_id}
          characterId={character.id}
          isGm={isGm}
        />
        <div className="space-y-4">
          <DerivedStatsPanel stats={derivedStats} />
          <EquipmentTabs
            gender={character.gender}
            age={character.age}
            backgroundNotes={character.background_notes}
            notes={character.notes}
            canEdit={editScopeCanEdit}
            liveCanEdit={canEdit}
            onGenderChange={(v) => updateField('gender', v)}
            onAgeChange={(v) => updateField('age', v)}
            onBackgroundNotesChange={(v) =>
              updateField('background_notes', v)
            }
            onNotesChange={(v) => updateField('notes', v)}
          />
        </div>
      </div>

      <SaveStatusToast status={saveStatus} />
    </div>
  )
}
