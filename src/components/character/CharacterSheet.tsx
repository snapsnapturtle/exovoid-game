import { useCallback, useMemo, useState } from 'react'
import { getRouteApi, useNavigate, useRouter } from '@tanstack/react-router'
import type { Character, PendingBonus } from '~/lib/types/domain'
import { useCharacter } from '~/lib/hooks/useCharacter'
import { usePendingBonuses } from '~/lib/hooks/usePendingBonuses'
import {
  RollContextProvider,
  type RollContextValue,
} from '~/lib/hooks/rollContext'
import { useCharacterProgression } from '~/lib/hooks/useCharacterProgression'
import { useRealtimeGameState } from '~/lib/hooks/useRealtimeGameState'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import { pendingLevelUp } from '~/lib/game-logic/level-up'
import { deleteCharacter, updatePortraitUrl } from '~/lib/server/characters'
import { duplicateNpc } from '~/lib/server/npcs'
import { uploadPortrait, PortraitError } from '~/lib/portrait'
import { CharacterHeader } from './CharacterHeader'
import { AttributesPanel } from './AttributesPanel'
import { DerivedStatsPanel } from './DerivedStatsPanel'
import { LivePlayPanel } from './LivePlayPanel'
import { SkillsPanel } from './SkillsPanel'
import { EquipmentTabs } from './EquipmentTabs'
import { DowntimeModal } from './downtime/DowntimeModal'
import { LevelUpModal } from './level-up/LevelUpModal'
import { NpcSheetControls } from '~/components/npcs/NpcSheetControls'

const gameRoute = getRouteApi('/_app/games/$gameId')

interface CharacterSheetProps {
  initial: Character
  canEdit: boolean
}

export function CharacterSheet({ initial, canEdit }: CharacterSheetProps) {
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [portraitUploading, setPortraitUploading] = useState(false)
  const [downtimeOpen, setDowntimeOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const navigate = useNavigate()
  const router = useRouter()
  const { character, updateField, flushSave } = useCharacter(initial, canEdit)
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

  const persistBonuses = useCallback(
    (next: PendingBonus[]) => updateField('pending_bonuses', next),
    [updateField],
  )
  const bonuses = usePendingBonuses(character.pending_bonuses, persistBonuses)

  // Single RollContext for both roll surfaces on the sheet (SkillsPanel +
  // DerivedStatsPanel). NPCs hidden from players default to a hidden roll.
  const rollValue = useMemo<RollContextValue>(
    () => ({
      pendingBonuses: character.pending_bonuses,
      applyBonus: bonuses.apply,
      consumeBonuses: bonuses.consume,
      removeBonus: bonuses.remove,
      edgeAvailable: character.edge_current,
      onSpendEdge: () =>
        updateField('edge_current', Math.max(0, character.edge_current - 1)),
      defaultHidden: character.is_npc && !character.visible_to_players,
    }),
    [
      character.pending_bonuses,
      character.edge_current,
      character.is_npc,
      character.visible_to_players,
      bonuses,
      updateField,
    ],
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
      // Drop cached loader data so the roster/game page re-fetches without
      // the now-deleted row (otherwise it shows until a manual refresh).
      await router.invalidate()
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

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const row = await duplicateNpc({ data: { npcId: character.id } })
      await router.invalidate()
      // Same route component — only the params change — so this instance
      // stays mounted across the navigation and we must clear the flag
      // ourselves once the new sheet has loaded.
      await navigate({
        to: '/games/$gameId/characters/$characterId',
        params: { gameId: row.game_id, characterId: row.id },
      })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to duplicate NPC')
    } finally {
      setDuplicating(false)
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
          canDuplicate={isGm}
          duplicating={duplicating}
          onDuplicate={handleDuplicate}
          members={members}
        />
      )}
      <CharacterHeader
        name={character.name}
        level={character.level}
        experience={character.experience}
        portraitUrl={character.portrait_url}
        canEdit={canEdit}
        isNpc={character.is_npc}
        backgroundNotes={character.background_notes}
        pendingLevelUp={pending}
        portraitUploading={portraitUploading}
        onExperienceChange={(v) => updateField('experience', v)}
        onPortraitChange={handlePortraitChange}
        onDowntime={() => setDowntimeOpen(true)}
        onLevelUp={() => setLevelUpOpen(true)}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AttributesPanel
            attributes={character.attributes}
            effectiveAttributes={effects.attributes}
            contributions={effects.attributeContributions}
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

      <RollContextProvider value={rollValue}>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkillsPanel
            attributes={effects.attributes}
            skills={character.skills}
            favoriteSkills={character.favorite_skills}
            canFavorite={canEdit}
            onToggleFavorite={toggleFavoriteSkill}
            gameId={character.game_id}
            characterId={character.id}
            characterName={character.name}
            availableSupport={liveGameState.pending_support}
          />
          <div className="space-y-4">
            <DerivedStatsPanel
              stats={derivedStats}
              contributions={effects.derivedContributions}
              gameId={character.game_id}
              characterId={character.id}
              notes={character.notes}
              onNotesChange={(v) => updateField('notes', v)}
              canEditNotes={canEdit}
            />
            <EquipmentTabs
              character={character}
              cyberImmunityCapacity={derivedStats.cyberImmunity}
              canEdit={canEdit}
              deleting={deleting}
              updateField={updateField}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </RollContextProvider>

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
