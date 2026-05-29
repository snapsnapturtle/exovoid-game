import { useCallback, useMemo, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import type { Character, PendingBonus } from '~/lib/types/database'
import { useCharacter } from '~/lib/hooks/useCharacter'
import { useCharacterProgression } from '~/lib/hooks/useCharacterProgression'
import { useRealtimeGameState } from '~/lib/hooks/useRealtimeGameState'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import { pendingLevelUp } from '~/lib/game-logic/level-up'
import { deleteCharacter, updatePortraitUrl } from '~/lib/server/characters'
import { uploadPortrait, PortraitError } from '~/lib/portrait'
import { CharacterHeader } from './CharacterHeader'
import { AttributesPanel } from './AttributesPanel'
import { DerivedStatsPanel } from './DerivedStatsPanel'
import { LivePlayPanel } from './LivePlayPanel'
import { SkillsPanel } from './SkillsPanel'
import { EquipmentTabs } from './EquipmentTabs'
import { SaveStatusToast } from './SaveStatusToast'
import { DowntimeModal } from './downtime/DowntimeModal'
import { LevelUpModal } from './level-up/LevelUpModal'
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
  const [downtimeOpen, setDowntimeOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const navigate = useNavigate()
  const {
    character,
    saveStatus,
    updateField,
    updateAttribute,
    updateSkill,
    flushSave,
  } = useCharacter(initial, canEdit)
  const {
    rows: progressionRows,
    loaded: progressionLoaded,
    appendLocal: appendProgressionLocal,
  } = useCharacterProgression(character.id)
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
    character.derived_stat_bonuses,
  )
  const derivedStats = effects.derived
  const isEditMode = mode === 'edit'
  const editScopeCanEdit = canEdit && isEditMode

  // PCs only — NPCs have no XP / level concept. Owner-only — the wizard
  // writes a `level-up` row that's gated by RLS to the character owner.
  // Gate on `progressionLoaded`: without it, the initial empty-rows state
  // makes pendingLevelUp briefly return `{ level: 2 }` for any level-2+
  // character, flashing the Level-up button on every page load.
  const pending = useMemo(
    () =>
      progressionLoaded && !character.is_npc && canEdit
        ? pendingLevelUp(character, progressionRows)
        : null,
    [character, progressionRows, canEdit, progressionLoaded],
  )

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
        pendingLevelUp={pending}
        deleting={deleting}
        portraitUploading={portraitUploading}
        onNameChange={(v) => updateField('name', v)}
        onExperienceChange={(v) => updateField('experience', v)}
        onPortraitChange={handlePortraitChange}
        onModeToggle={() => setMode((m) => (m === 'play' ? 'edit' : 'play'))}
        onDelete={handleDelete}
        onDowntime={() => setDowntimeOpen(true)}
        onLevelUp={() => setLevelUpOpen(true)}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AttributesPanel
            attributes={character.attributes}
            effectiveAttributes={effects.attributes}
            contributions={effects.attributeContributions}
            // Attribute steppers are locked post-creation: attribute
            // increases only happen via Training: <Attribute> talents
            // (picked through the level-up wizard). Direct edits would
            // bypass the progression log and silently desync history.
            canEdit={false}
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
            canEdit={canEdit}
            isMinion={character.is_minion}
            defaultHidden={character.is_npc && !character.visible_to_players}
            onHealthChange={(v) => updateField('health_current', v)}
            onEdgeChange={(v) => updateField('edge_current', v)}
            onInjuriesChange={(v) => updateField('injuries', v)}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkillsPanel
          attributes={effects.attributes}
          skills={character.skills}
          // Skill steppers are locked post-creation: bumps happen through
          // the level-up wizard (skill points) and the Train Skill
          // downtime activity (lifetime cap ≤ level). Anything else
          // would bypass the progression log. Players who think they
          // need a direct edit should go to the GM.
          canEdit={false}
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
            notes={character.notes}
            onNotesChange={(v) => updateField('notes', v)}
            canEditNotes={canEdit}
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

      <SaveStatusToast status={saveStatus} />

      {downtimeOpen && (
        <DowntimeModal
          character={character}
          effects={effects}
          gameId={character.game_id}
          characterId={character.id}
          progression={progressionRows}
          onClose={() => setDowntimeOpen(false)}
          onUpdateField={updateField}
        />
      )}

      {levelUpOpen && pending && (
        <LevelUpModal
          character={character}
          level={pending.level}
          onUpdateField={updateField}
          flushSave={flushSave}
          onCommitted={(row) => appendProgressionLocal(row)}
          onClose={() => setLevelUpOpen(false)}
        />
      )}
    </div>
  )
}
