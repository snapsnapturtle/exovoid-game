import { useCallback, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import type { Character, PendingBonus } from '~/lib/types/database'
import { useCharacter } from '~/lib/hooks/useCharacter'
import { useRealtimeGameState } from '~/lib/hooks/useRealtimeGameState'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import { deleteCharacter, updatePortraitUrl } from '~/lib/server/characters'
import { uploadPortrait, PortraitError } from '~/lib/portrait'
import { CharacterHeader } from './CharacterHeader'
import { AttributesPanel } from './AttributesPanel'
import { DerivedStatsPanel } from './DerivedStatsPanel'
import { LivePlayPanel } from './LivePlayPanel'
import { SkillsPanel } from './SkillsPanel'
import { EquipmentTabs } from './EquipmentTabs'
import { SaveStatusToast } from './SaveStatusToast'
import { NpcSheetControls } from '~/components/npcs/NpcSheetControls'
import type { ApplyBonusInput } from '~/components/dice/RollResultView'

const gameRoute = getRouteApi('/_app/games/$gameId')

interface CharacterSheetProps {
  initial: Character
  canEdit: boolean
}

type SheetMode = 'play' | 'edit'

export function CharacterSheet({ initial, canEdit }: CharacterSheetProps) {
  const [mode, setMode] = useState<SheetMode>('play')
  const [deleting, setDeleting] = useState(false)
  const [portraitUploading, setPortraitUploading] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const navigate = useNavigate()
  const { character, saveStatus, updateField, updateAttribute, updateSkill } =
    useCharacter(initial, canEdit)
  const { members, currentUserId, isGm, gameState } = gameRoute.useLoaderData()
  const liveGameState = useRealtimeGameState(gameState)
  // Single role: GM (always allowed in their own game) or the current
  // controller. The creator field is informational only — once an NPC is
  // handed off, the previous controller loses every right.
  const canManageNpcFlags =
    character.is_npc && (isGm || character.controller_user_id === currentUserId)

  const effects = applyPassiveEffects(
    character.attributes,
    character.talents,
    character.cyberware,
    character.inventory,
  )
  const derivedStats = effects.derived
  const isEditMode = mode === 'edit'
  const editScopeCanEdit = canEdit && isEditMode

  async function handlePortraitChange(file: File) {
    setPortraitUploading(true)
    try {
      const url = await uploadPortrait(character.id, file)
      await updatePortraitUrl({
        data: { characterId: character.id, portraitUrl: url },
      })
      updateField('portrait_url', url)
    } catch (e) {
      const msg =
        e instanceof PortraitError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to upload portrait'
      alert(msg)
    } finally {
      setPortraitUploading(false)
    }
  }

  const applyPendingBonus = useCallback(
    (bonus: ApplyBonusInput): string => {
      const entry: PendingBonus = {
        id: crypto.randomUUID(),
        label: bonus.label,
        modifier: bonus.modifier,
        source: bonus.source,
        addedAt: new Date().toISOString(),
      }
      updateField('pending_bonuses', [...character.pending_bonuses, entry])
      return entry.id
    },
    [character.pending_bonuses, updateField],
  )

  const consumePendingBonuses = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      const drop = new Set(ids)
      updateField(
        'pending_bonuses',
        character.pending_bonuses.filter((b) => !drop.has(b.id)),
      )
    },
    [character.pending_bonuses, updateField],
  )

  const removePendingBonus = useCallback(
    (id: string) => consumePendingBonuses([id]),
    [consumePendingBonuses],
  )

  const toggleFavoriteSkill = useCallback(
    (skillId: string) => {
      const current = character.favorite_skills
      const next = current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId]
      updateField('favorite_skills', next)
    },
    [character.favorite_skills, updateField],
  )

  async function handleDelete() {
    const label = character.is_npc ? 'NPC' : 'character'
    const confirmed = window.confirm(
      `Delete ${character.name || `this ${label}`}? This cannot be undone.`,
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const { gameId } = await deleteCharacter({
        data: { characterId: character.id },
      })
      if (character.is_npc) {
        navigate({ to: '/games/$gameId/npcs', params: { gameId } })
      } else {
        navigate({ to: '/games/$gameId', params: { gameId } })
      }
    } catch (e) {
      setDeleting(false)
      alert(e instanceof Error ? e.message : 'Failed to delete character')
    }
  }

  return (
    <div className="space-y-4 p-6">
      {character.is_npc && (
        <NpcSheetControls
          characterId={character.id}
          isMinion={character.is_minion}
          visibleToPlayers={character.visible_to_players}
          controllerUserId={character.controller_user_id}
          canManageFlags={canManageNpcFlags}
          members={members}
        />
      )}
      <CharacterHeader
        name={character.name}
        career={character.career}
        level={character.level}
        experience={character.experience}
        portraitUrl={character.portrait_url}
        canEdit={editScopeCanEdit}
        showModeToggle={canEdit}
        isEditMode={isEditMode}
        isNpc={character.is_npc}
        deleting={deleting}
        portraitUploading={portraitUploading}
        onNameChange={(v) => updateField('name', v)}
        onCareerChange={(v) => updateField('career', v)}
        onExperienceChange={(v) => updateField('experience', v)}
        onPortraitChange={handlePortraitChange}
        onModeToggle={() => setMode((m) => (m === 'play' ? 'edit' : 'play'))}
        onDelete={handleDelete}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AttributesPanel
            attributes={character.attributes}
            effectiveAttributes={effects.attributes}
            contributions={effects.attributeContributions}
            canEdit={editScopeCanEdit}
            onAttributeChange={updateAttribute}
          />
        </div>
        <div className="lg:col-span-4">
          <LivePlayPanel
            gameId={character.game_id}
            characterId={character.id}
            healthMax={derivedStats.health}
            healthCurrent={character.health_current}
            edgeMax={derivedStats.edge}
            edgeCurrent={character.edge_current}
            injuries={character.injuries}
            pendingBonuses={character.pending_bonuses}
            canEdit={canEdit}
            isMinion={character.is_minion}
            defaultHidden={character.is_npc && !character.visible_to_players}
            onHealthChange={(v) => updateField('health_current', v)}
            onEdgeChange={(v) => updateField('edge_current', v)}
            onInjuriesChange={(v) => updateField('injuries', v)}
            onRemoveBonus={removePendingBonus}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkillsPanel
          attributes={effects.attributes}
          skills={character.skills}
          canEdit={editScopeCanEdit}
          onSkillChange={updateSkill}
          favoriteSkills={character.favorite_skills}
          canFavorite={canEdit}
          onToggleFavorite={toggleFavoriteSkill}
          gameId={character.game_id}
          characterId={character.id}
          characterName={character.name}
          availableSupport={liveGameState.pending_support}
          edgeAvailable={character.edge_current}
          onSpendEdge={() =>
            updateField('edge_current', Math.max(0, character.edge_current - 1))
          }
          pendingBonuses={character.pending_bonuses}
          onApplyBonus={applyPendingBonus}
          onConsumeBonuses={consumePendingBonuses}
          onRemoveBonus={removePendingBonus}
          defaultHidden={character.is_npc && !character.visible_to_players}
        />
        <div className="space-y-4">
          <DerivedStatsPanel
            stats={derivedStats}
            contributions={effects.derivedContributions}
            gameId={character.game_id}
            characterId={character.id}
            edgeAvailable={character.edge_current}
            onSpendEdge={() =>
              updateField(
                'edge_current',
                Math.max(0, character.edge_current - 1),
              )
            }
            pendingBonuses={character.pending_bonuses}
            onApplyBonus={applyPendingBonus}
            onConsumeBonuses={consumePendingBonuses}
            onRemoveBonus={removePendingBonus}
            defaultHidden={character.is_npc && !character.visible_to_players}
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
            isNpc={character.is_npc}
            onGenderChange={(v) => updateField('gender', v)}
            onAgeChange={(v) => updateField('age', v)}
            onBackgroundNotesChange={(v) => updateField('background_notes', v)}
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
            ? 'border-accent-700 bg-accent-700/15 text-accent-900'
            : 'border-gray-400 bg-background-200 text-gray-1000 hover:border-accent-700 hover:text-white'
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
        className={`fixed right-[21rem] top-12 z-30 flex w-[24rem] origin-top-right flex-col rounded-xl border border-gray-400 bg-background-200 transition-all duration-150 ${
          notesOpen
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-400 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-900">
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
              className="w-full resize-none rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-gray-1000">
              {character.notes || (
                <span className="text-gray-700">No notes yet.</span>
              )}
            </p>
          )}
        </div>
      </div>

      <SaveStatusToast status={saveStatus} />
    </div>
  )
}
