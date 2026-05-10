import type { SaveStatus } from '~/lib/hooks/useCharacter'

interface SaveStatusToastProps {
  status: SaveStatus
}

/**
 * Bottom-anchored toast for character save state. Slides up from below
 * the viewport while a save is in flight or just resolved, slides back
 * down when the status returns to 'idle' (useCharacter auto-resets the
 * `saved` state to 'idle' after ~2s).
 */
export function SaveStatusToast({ status }: SaveStatusToastProps) {
  const visible = status !== 'idle'
  const label =
    status === 'saving'
      ? 'Saving…'
      : status === 'saved'
        ? 'Saved'
        : status === 'error'
          ? 'Save failed'
          : ''

  const tone =
    status === 'saved'
      ? 'bg-success-500/90 text-white'
      : status === 'error'
        ? 'bg-danger-500/90 text-white'
        : 'bg-void-700 text-gray-200'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-xl shadow-black/50 transition-all duration-200 ${tone} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-14 opacity-0'
      }`}
    >
      {label}
    </div>
  )
}
