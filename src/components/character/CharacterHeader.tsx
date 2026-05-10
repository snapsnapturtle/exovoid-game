const XP_THRESHOLDS = [0, 20, 50, 90, 140, 200, 270, 350, 440, 540, 650, 770, 900, 1040, 1200]

interface CharacterHeaderProps {
  name: string
  career: string
  level: number
  experience: number
  canEdit: boolean
  showModeToggle: boolean
  isEditMode: boolean
  deleting: boolean
  onNameChange: (name: string) => void
  onCareerChange: (career: string) => void
  onExperienceChange: (value: number) => void
  onModeToggle: () => void
  onDelete: () => void
}

export function CharacterHeader({
  name,
  career,
  level,
  experience,
  canEdit,
  showModeToggle,
  isEditMode,
  deleting,
  onNameChange,
  onCareerChange,
  onExperienceChange,
  onModeToggle,
  onDelete,
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
          <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
            <span>XP</span>
            <div className="flex items-center gap-2">
              <span>
                {experience} / {nextThreshold}
              </span>
              <button
                onClick={() => onExperienceChange(Math.max(0, experience - 1))}
                disabled={experience <= 0}
                aria-label="Decrease XP"
                className="flex h-5 w-5 items-center justify-center rounded bg-void-700 text-xs text-gray-300 transition hover:bg-void-600 disabled:opacity-30"
              >
                −
              </button>
              <button
                onClick={() => onExperienceChange(experience + 1)}
                aria-label="Add 1 XP"
                className="flex h-5 w-5 items-center justify-center rounded bg-void-700 text-xs text-gray-300 transition hover:bg-void-600"
              >
                +
              </button>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-void-700">
            <div
              className="h-full rounded-full bg-accent-500 transition-all"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {showModeToggle && isEditMode && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg border border-danger-500/60 bg-danger-500/10 px-3 py-1.5 text-sm text-danger-400 transition hover:bg-danger-500/20 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
        {showModeToggle && (
          <button
            onClick={onModeToggle}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              isEditMode
                ? 'border-accent-500 bg-accent-500/20 text-accent-300 hover:bg-accent-500/30'
                : 'border-void-600 bg-void-700 text-gray-300 hover:border-accent-500 hover:text-white'
            }`}
          >
            {isEditMode ? 'Done editing' : 'Edit'}
          </button>
        )}
        <button
          disabled
          title="Coming soon"
          className="rounded-lg border border-void-600 bg-void-700/50 px-3 py-1.5 text-sm text-gray-500"
        >
          Downtime
        </button>
      </div>
    </div>
  )
}
