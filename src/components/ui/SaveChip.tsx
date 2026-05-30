import type { SaveStatus } from '~/lib/hooks/saveStatusContext'

interface SaveChipProps {
  status: SaveStatus
}

const TONE: Record<Exclude<SaveStatus, 'idle'>, string> = {
  saving: 'border-gray-400 bg-gray-200 text-gray-900',
  saved: 'border-success-400 bg-success-200 text-success-900',
  error: 'border-danger-400 bg-danger-200 text-danger-900',
}

const LABEL: Record<Exclude<SaveStatus, 'idle'>, string> = {
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
}

/**
 * Inline pill that surfaces the aggregate save state from
 * SaveStatusProvider. Stays mounted with `opacity-0` when idle so its
 * sibling layout doesn't jump as saves come and go.
 */
export function SaveChip({ status }: SaveChipProps) {
  const visible = status !== 'idle'
  const resolved = status === 'idle' ? 'saving' : status
  return (
    <span
      role="status"
      aria-live="polite"
      className={`pointer-events-none inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs transition-opacity duration-200 ${TONE[resolved]} ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {visible ? LABEL[resolved] : ' '}
    </span>
  )
}
