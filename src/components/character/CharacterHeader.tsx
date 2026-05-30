import { Button } from '~/components/ui/Button'
import { xpProgress } from '~/lib/game-logic/leveling'
import { CharacterPortrait } from './CharacterPortrait'

interface CharacterHeaderProps {
  name: string
  career: string
  level: number
  experience: number
  portraitUrl: string | null
  canEdit: boolean
  showModeToggle: boolean
  isEditMode: boolean
  /** NPCs hide XP, level pill, career, and the Downtime button — none of
   * those concepts apply to GM-managed adversaries / allies. */
  isNpc: boolean
  /** Set when there's an uncommitted level-up (`pendingLevelUp(...)`).
   * Drives the "Level up" CTA and the XP-bar pulse. Null when nothing
   * is pending or the viewer isn't the owner. */
  pendingLevelUp: { level: number } | null
  deleting: boolean
  portraitUploading: boolean
  onNameChange: (name: string) => void
  onExperienceChange: (value: number) => void
  onPortraitChange: (file: File) => void
  onModeToggle: () => void
  onDelete: () => void
  onDowntime: () => void
  onLevelUp: () => void
}

export function CharacterHeader({
  name,
  career,
  level,
  experience,
  portraitUrl,
  canEdit,
  showModeToggle,
  isEditMode,
  isNpc,
  pendingLevelUp,
  deleting,
  portraitUploading,
  onNameChange,
  onExperienceChange,
  onPortraitChange,
  onModeToggle,
  onDelete,
  onDowntime,
  onLevelUp,
}: CharacterHeaderProps) {
  const { next: nextThreshold, percent: xpPercent } = xpProgress(experience)

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-xl border border-gray-400 bg-background-200 p-3">
      <CharacterPortrait
        name={name}
        portraitUrl={portraitUrl}
        size="md"
        // Portrait is editable any time the viewer has permission — not
        // gated on edit mode. `showModeToggle` is the root canEdit signal
        // from CharacterSheet (vs. `canEdit` here, which is mode-gated).
        canEdit={showModeToggle}
        onUpload={onPortraitChange}
        uploading={portraitUploading}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {canEdit ? (
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              size={Math.max(name.length || 0, 8)}
              autoComplete="off"
              className="min-w-[8ch] rounded border border-transparent bg-transparent text-2xl font-bold text-white field-sizing-content hover:border-gray-400 focus:border-accent-900 focus:outline-none"
            />
          ) : (
            <h2 className="text-2xl font-bold text-white">{name}</h2>
          )}
          {!isNpc && (
            <span className="rounded-full bg-accent-700/20 px-3 py-1 text-sm font-medium text-accent-900">
              Level {level}
            </span>
          )}
        </div>
        {!isNpc && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900">Career:</span>
            {/* Career is read-only post-creation: the talent tree and
                level-up legality are derived from this field, so a
                free-text edit could leave the player with a level-up
                button that surfaces zero valid talents. Creation owns
                career selection; if a swap is genuinely needed, that's
                a GM data fix outside this UI for now. */}
            <span className="text-sm text-gray-1000">{career || 'None'}</span>
          </div>
        )}
        {!isNpc && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-900">
              <span>XP</span>
              <div className="flex items-center gap-2">
                <span>
                  {experience} / {nextThreshold}
                </span>
                <button
                  onClick={() =>
                    onExperienceChange(Math.max(0, experience - 1))
                  }
                  disabled={experience <= 0}
                  aria-label="Decrease XP"
                  className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs text-gray-1000 transition not-disabled:hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  −
                </button>
                <button
                  onClick={() => onExperienceChange(experience + 1)}
                  aria-label="Add 1 XP"
                  className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs text-gray-1000 transition hover:bg-gray-400"
                >
                  +
                </button>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-accent-700 transition-all"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {showModeToggle && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={deleting || !isEditMode}
            aria-hidden={!isEditMode}
            tabIndex={isEditMode ? 0 : -1}
            className={!isEditMode ? 'pointer-events-none invisible' : ''}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
        {showModeToggle && (
          <Button
            variant="ghost"
            onClick={onModeToggle}
            className="min-w-[7.5rem]"
          >
            {isEditMode ? 'Done editing' : 'Edit'}
          </Button>
        )}
        {!isNpc && showModeToggle && pendingLevelUp && (
          // Only the owner sees this (showModeToggle is the root canEdit
          // signal). Appears only when there's an uncommitted level-up; the
          // wizard writes a `level-up` row in character_progression on
          // commit, which makes `pendingLevelUp` null and hides the button.
          <Button variant="primary" onClick={onLevelUp}>
            Level up to {pendingLevelUp.level}
          </Button>
        )}
        {!isNpc && showModeToggle && (
          // Gate on edit permission (showModeToggle is the root canEdit signal
          // from CharacterSheet). Viewers without edit rights can't open the
          // downtime modal — otherwise their Apply clicks would mutate local
          // state, the save would silently drop, and Train Skill would fire a
          // recordProgression call that RLS rejects.
          <Button variant="secondary" onClick={onDowntime}>
            Downtime
          </Button>
        )}
      </div>
    </div>
  )
}
