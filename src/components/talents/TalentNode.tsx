export type NodeState =
  | 'owned'
  | 'available'
  | 'locked-prereq'
  | 'locked-no-points'

interface TalentNodeProps {
  name: string
  description: string
  state: NodeState
  selected: boolean
  reason?: string
  onClick: () => void
}

const STATE_CLASSES: Record<NodeState, string> = {
  owned:
    'border-accent-500 bg-accent-500/20 text-white shadow-[0_0_0_1px_rgb(99_102_241_/_0.4)]',
  available:
    'border-accent-500 bg-void-700 text-white hover:bg-accent-500/10',
  'locked-prereq':
    'border-dashed border-void-600 bg-void-800 text-gray-500 cursor-not-allowed',
  'locked-no-points':
    'border-accent-500/40 bg-void-700/60 text-gray-400 opacity-50 cursor-not-allowed',
}

const STATE_GLYPH: Record<NodeState, string> = {
  owned: '✓',
  available: '◯',
  'locked-prereq': '─',
  'locked-no-points': '◌',
}

export function TalentNode({
  name,
  description,
  state,
  selected,
  reason,
  onClick,
}: TalentNodeProps) {
  const isLocked = state.startsWith('locked')
  const ring = selected ? 'ring-2 ring-accent-400' : ''

  return (
    <button
      onClick={onClick}
      title={reason ?? ''}
      className={`relative flex w-44 shrink-0 flex-col items-stretch rounded-lg border p-2 text-left text-xs transition ${STATE_CLASSES[state]} ${ring}`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`text-sm leading-none ${isLocked ? '' : state === 'owned' ? 'text-accent-300' : 'text-accent-400'}`}
        >
          {STATE_GLYPH[state]}
        </span>
        <span className="flex-1 truncate font-medium">{name}</span>
      </div>
      <div className="line-clamp-2 text-[11px] text-gray-400">{description}</div>
    </button>
  )
}
