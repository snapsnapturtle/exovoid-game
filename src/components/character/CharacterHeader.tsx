import type { SaveStatus } from '~/lib/hooks/useCharacter'

const XP_THRESHOLDS = [0, 20, 50, 90, 140, 200, 270, 350, 440, 540, 650, 770, 900, 1040, 1200]

interface CharacterHeaderProps {
  name: string
  career: string
  level: number
  experience: number
  saveStatus: SaveStatus
  canEdit: boolean
  onNameChange: (name: string) => void
  onCareerChange: (career: string) => void
}

export function CharacterHeader({
  name,
  career,
  level,
  experience,
  saveStatus,
  canEdit,
  onNameChange,
  onCareerChange,
}: CharacterHeaderProps) {
  const currentThreshold = XP_THRESHOLDS[level - 1] ?? 0
  const nextThreshold = XP_THRESHOLDS[level] ?? currentThreshold
  const xpInLevel = experience - currentThreshold
  const xpNeeded = nextThreshold - currentThreshold
  const xpPercent = xpNeeded > 0 ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-xl border border-void-600 bg-void-800 p-6">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {canEdit ? (
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="rounded border border-transparent bg-transparent text-2xl font-bold text-white hover:border-void-600 focus:border-accent-400 focus:outline-none"
            />
          ) : (
            <h2 className="text-2xl font-bold text-white">{name}</h2>
          )}
          <span className="rounded-full bg-accent-500/20 px-3 py-1 text-sm font-medium text-accent-400">
            Level {level}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Career:</span>
          {canEdit ? (
            <input
              type="text"
              value={career}
              onChange={(e) => onCareerChange(e.target.value)}
              className="rounded border border-transparent bg-transparent text-sm text-gray-300 hover:border-void-600 focus:border-accent-400 focus:outline-none"
              placeholder="Choose a career"
            />
          ) : (
            <span className="text-sm text-gray-300">{career || 'None'}</span>
          )}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-400">
            <span>XP</span>
            <span>
              {experience} / {nextThreshold}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-void-700">
            <div
              className="h-full rounded-full bg-accent-500 transition-all"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>
      <div className="text-sm">
        {saveStatus === 'saving' && (
          <span className="text-gray-400">Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-success-400">Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-danger-400">Save failed</span>
        )}
      </div>
    </div>
  )
}
