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
    'border-accent-700 bg-accent-700/20 text-white shadow-[0_0_0_1px_rgb(99_102_241_/_0.4)]',
  available:
    'border-accent-700 bg-gray-100 text-white hover:bg-accent-700/10',
  'locked-prereq':
    'border-dashed border-gray-400 bg-background-200 text-gray-700 cursor-not-allowed',
  'locked-no-points':
    'border-accent-700/40 bg-gray-100/60 text-gray-900 opacity-50 cursor-not-allowed',
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
  const ring = selected ? 'ring-2 ring-accent-900' : ''

  return (
    <button
      onClick={onClick}
      title={reason ?? ''}
      className={`relative flex w-44 shrink-0 flex-col items-stretch rounded-lg border p-2 text-left text-xs transition ${STATE_CLASSES[state]} ${ring}`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`text-sm leading-none ${isLocked ? '' : state === 'owned' ? 'text-accent-900' : 'text-accent-900'}`}
        >
          {STATE_GLYPH[state]}
        </span>
        <span className="flex-1 truncate font-medium">{name}</span>
      </div>
      <div className="line-clamp-2 text-[11px] text-gray-900">{description}</div>
    </button>
  )
}
