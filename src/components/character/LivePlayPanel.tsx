interface LivePlayPanelProps {
  healthMax: number
  healthCurrent: number | null
  edgeMax: number
  edgeCurrent: number
  canEdit: boolean
  onHealthChange: (value: number | null) => void
  onEdgeChange: (value: number) => void
}

/**
 * Compact health + edge trackers for the top stats band.
 * Always editable when the user has permission, regardless of the
 * sheet's edit/play mode toggle.
 */
export function LivePlayPanel({
  healthMax,
  healthCurrent,
  edgeMax,
  edgeCurrent,
  canEdit,
  onHealthChange,
  onEdgeChange,
}: LivePlayPanelProps) {
  const currentHealth = healthCurrent ?? healthMax

  function adjustHealth(delta: number) {
    const next = currentHealth + delta
    onHealthChange(next >= healthMax ? null : Math.max(0, next))
  }

  function adjustEdge(delta: number) {
    // Edge can legally exceed the normal max via downtime "Seek Inspiration",
    // combat "Assess Opportunities", and the ship action "Make Battle Plan".
    onEdgeChange(Math.max(0, edgeCurrent + delta))
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Tracker
        label="Health"
        current={currentHealth}
        max={healthMax}
        canEdit={canEdit}
        onAdjust={adjustHealth}
      />
      <Tracker
        label="Edge"
        current={edgeCurrent}
        max={edgeMax}
        canEdit={canEdit}
        onAdjust={adjustEdge}
        allowAboveMax
      />
    </div>
  )
}

interface TrackerProps {
  label: string
  current: number
  max: number
  canEdit: boolean
  onAdjust: (delta: number) => void
  allowAboveMax?: boolean
}

function Tracker({
  label,
  current,
  max,
  canEdit,
  onAdjust,
  allowAboveMax = false,
}: TrackerProps) {
  const aboveMax = current > max
  return (
    <div className="rounded-xl border border-void-600 bg-void-800 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {canEdit && (
          <button
            onClick={() => onAdjust(-1)}
            disabled={current <= 0}
            aria-label={`Decrease ${label}`}
            className="flex h-7 w-7 items-center justify-center rounded bg-void-600 text-base text-gray-200 transition hover:bg-void-500 disabled:opacity-30"
          >
            −
          </button>
        )}
        <div className="flex flex-1 items-baseline justify-center gap-1">
          <span
            className={`text-2xl font-bold leading-none ${aboveMax ? 'text-success-400' : 'text-white'}`}
          >
            {current}
          </span>
          <span className="text-xs text-gray-500">/ {max}</span>
        </div>
        {canEdit && (
          <button
            onClick={() => onAdjust(+1)}
            disabled={!allowAboveMax && current >= max}
            aria-label={`Increase ${label}`}
            className="flex h-7 w-7 items-center justify-center rounded bg-void-600 text-base text-gray-200 transition hover:bg-void-500 disabled:opacity-30"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
