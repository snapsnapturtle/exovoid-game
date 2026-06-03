import { Button } from '~/components/ui/Button'
import { xpProgress } from '~/lib/game-logic/leveling'
import { CharacterPortrait } from './CharacterPortrait'

interface CharacterHeaderProps {
  name: string
  level: number
  experience: number
  portraitUrl: string | null
  /** Root edit permission for the viewer (e.g. character owner or GM).
   * Gates the in-header affordances that don't sit in the Background
   * tab — portrait upload, XP +/-, level-up CTA, Downtime button. The
   * Background tab owns its own edit-mode toggle for name / gender /
   * age / background notes / delete. */
  canEdit: boolean
  /** NPCs hide XP, level pill, and the Downtime button — none of
   * those concepts apply to GM-managed adversaries / allies. */
  isNpc: boolean
  /** Surfaced inline beneath the name for NPCs only — fills the slot
   * the XP bar occupies for PCs and gives the GM a glance-able stat
   * block / disposition note without opening the Background tab. PCs
   * have their notes hidden here (they live in the Background tab). */
  backgroundNotes: string
  /** Set when there's an uncommitted level-up (`pendingLevelUp(...)`).
   * Drives the "Level up" CTA and the XP-bar pulse. Null when nothing
   * is pending or the viewer isn't the owner. */
  pendingLevelUp: { level: number } | null
  portraitUploading: boolean
  onExperienceChange: (value: number) => void
  onPortraitChange: (file: File) => void
  onDowntime: () => void
  onLevelUp: () => void
}

export function CharacterHeader({
  name,
  level,
  experience,
  portraitUrl,
  canEdit,
  isNpc,
  backgroundNotes,
  pendingLevelUp,
  portraitUploading,
  onExperienceChange,
  onPortraitChange,
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
        canEdit={canEdit}
        onUpload={onPortraitChange}
        uploading={portraitUploading}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{name}</h2>
          {!isNpc && (
            <span className="rounded-full bg-accent-700/20 px-3 py-1 text-sm font-medium text-accent-900">
              Level {level}
            </span>
          )}
        </div>
        {isNpc && backgroundNotes && (
          <p className="whitespace-pre-line text-sm text-gray-1000">
            {backgroundNotes}
          </p>
        )}
        {!isNpc && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-900">
              <span>XP</span>
              <div className="flex items-center gap-2">
                <span>
                  {experience} / {nextThreshold}
                </span>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() =>
                    onExperienceChange(Math.max(0, experience - 1))
                  }
                  disabled={experience <= 0}
                  aria-label="Decrease XP"
                  className="w-5 px-0"
                >
                  −
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => onExperienceChange(experience + 1)}
                  aria-label="Add 1 XP"
                  className="w-5 px-0"
                >
                  +
                </Button>
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
        {!isNpc && canEdit && pendingLevelUp && (
          // Only the owner sees this. Appears when there's an
          // uncommitted level-up; the wizard writes a `level-up` row in
          // character_progression on commit, which makes
          // `pendingLevelUp` null and hides the button.
          <Button variant="primary" onClick={onLevelUp}>
            Level up to {pendingLevelUp.level}
          </Button>
        )}
        {!isNpc && canEdit && (
          // Gate on edit permission. Viewers without edit rights can't
          // open the downtime modal — otherwise their Apply clicks
          // would mutate local state, the save would silently drop, and
          // Train Skill would fire a recordProgression call that RLS
          // rejects.
          <Button variant="secondary" onClick={onDowntime}>
            Downtime
          </Button>
        )}
      </div>
    </div>
  )
}
