import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Character } from '~/lib/types/database'
import { useCharacter } from '~/lib/hooks/useCharacter'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import { deleteCharacter } from '~/lib/server/characters'
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
  const [deleting, setDeleting] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const navigate = useNavigate()
  const { character, saveStatus, updateField, updateAttribute, updateSkill } =
    useCharacter(initial, canEdit)

  const effects = applyPassiveEffects(
    character.attributes,
    character.talents,
    character.cyberware,
    character.inventory,
  )
  const derivedStats = effects.derived
  const isEditMode = mode === 'edit'
  const editScopeCanEdit = canEdit && isEditMode

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${character.name || 'this character'}? This cannot be undone.`,
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const { gameId } = await deleteCharacter({
        data: { characterId: character.id },
      })
      navigate({ to: '/games/$gameId', params: { gameId } })
    } catch (e) {
      setDeleting(false)
      alert(e instanceof Error ? e.message : 'Failed to delete character')
    }
  }

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
        deleting={deleting}
        onNameChange={(v) => updateField('name', v)}
        onCareerChange={(v) => updateField('career', v)}
        onExperienceChange={(v) => updateField('experience', v)}
        onModeToggle={() =>
          setMode((m) => (m === 'play' ? 'edit' : 'play'))
        }
        onDelete={handleDelete}
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <AttributesPanel
          attributes={character.attributes}
          effectiveAttributes={effects.attributes}
          contributions={effects.attributeContributions}
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
          attributes={effects.attributes}
          skills={character.skills}
          canEdit={editScopeCanEdit}
          onSkillChange={updateSkill}
          gameId={character.game_id}
          characterId={character.id}
          isGm={isGm}
        />
        <div className="space-y-4">
          <DerivedStatsPanel
            stats={derivedStats}
            contributions={effects.derivedContributions}
          />
          <EquipmentTabs
            gender={character.gender}
            age={character.age}
            backgroundNotes={character.background_notes}
            canEdit={editScopeCanEdit}
            talents={character.talents}
            cyberware={character.cyberware}
            cyberImmunityCapacity={derivedStats.cyberImmunity}
            inventory={character.inventory}
            credits={character.credits}
            assets={character.assets}
            level={character.level}
            career={character.career}
            gameId={character.game_id}
            characterId={character.id}
            onGenderChange={(v) => updateField('gender', v)}
            onAgeChange={(v) => updateField('age', v)}
            onBackgroundNotesChange={(v) =>
              updateField('background_notes', v)
            }
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setNotesOpen((o) => !o)}
        aria-label={notesOpen ? 'Close play notes' : 'Open play notes'}
        aria-expanded={notesOpen}
        className={`fixed right-[21rem] top-4 z-40 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
          notesOpen
            ? 'border-accent-500 bg-accent-500/15 text-accent-200'
            : 'border-void-600 bg-void-800 text-gray-300 hover:border-accent-500 hover:text-white'
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" x2="15" y1="13" y2="13" />
          <line x1="9" x2="15" y1="17" y2="17" />
        </svg>
        Notes
      </button>

      <div
        aria-hidden={!notesOpen}
        role="dialog"
        aria-label="Play notes"
        className={`fixed right-[21rem] top-12 z-30 flex w-[24rem] origin-top-right flex-col rounded-xl border border-void-600 bg-void-800 transition-all duration-150 ${
          notesOpen
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-void-600 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Play notes
          </span>
        </header>
        <div className="p-3">
          {canEdit ? (
            <textarea
              value={character.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Quick notes during play…"
              rows={10}
              className="w-full resize-none rounded-lg border border-void-600 bg-void-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-gray-300">
              {character.notes || (
                <span className="text-gray-500">No notes yet.</span>
              )}
            </p>
          )}
        </div>
      </div>

      <SaveStatusToast status={saveStatus} />
    </div>
  )
}
