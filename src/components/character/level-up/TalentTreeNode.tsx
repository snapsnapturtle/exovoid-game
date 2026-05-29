/**
 * One talent in the wizard's tree-style picker. Three states the level-up
 * context cares about: `owned` (already on the character — can't pick),
 * `available` (tier prereq met, not owned — clickable to select), and
 * `locked-prereq` (not enough lower-tier talents in this career yet —
 * shown for context but inert).
 *
 * Visually the previous `/talents` page's nodes: glyph + name + truncated
 * description on a small card, color-coded by state, with an accent ring
 * when selected.
 */
export type TalentNodeState = 'owned' | 'available' | 'locked-prereq'

interface Props {
  name: string
  description: string
  state: TalentNodeState
  selected: boolean
  reason?: string
  onClick?: () => void
}

const STATE_CLASSES: Record<TalentNodeState, string> = {
  owned: 'border-accent-700 bg-accent-700/20 text-white',
  available: 'border-gray-400 bg-gray-100 text-white hover:border-accent-700',
  'locked-prereq':
    'border-dashed border-gray-400 bg-background-200 text-gray-700 cursor-not-allowed',
}

export function TalentTreeNode({
  name,
  description,
  state,
  selected,
  reason,
  onClick,
}: Props) {
  const isInteractive = state === 'available'
  const ring = selected ? 'ring-2 ring-accent-900' : ''
  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      title={reason ?? ''}
      className={`relative flex w-44 shrink-0 flex-col items-stretch rounded-lg border p-2 text-left text-xs transition ${STATE_CLASSES[state]} ${ring}`}
    >
      <div className="mb-1 truncate font-medium">{name}</div>
      <div className="line-clamp-2 text-[11px] text-gray-900">
        {description}
      </div>
    </button>
  )
}
