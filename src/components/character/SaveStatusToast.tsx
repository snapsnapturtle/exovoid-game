import type { SaveStatus } from '~/lib/hooks/useCharacter'

interface SaveStatusToastProps {
  status: SaveStatus
}

/**
 * Bottom-anchored toast for character save state. Saving is fast enough
 * that the in-flight state isn't worth surfacing — the toast only slides
 * up on the resolved states (`saved` or `error`) and slides back down
 * when useCharacter auto-resets `saved` → `idle` after ~2s.
 */
export function SaveStatusToast({ status }: SaveStatusToastProps) {
  const visible = status === 'saved' || status === 'error'
  const label =
    status === 'saved'
      ? 'Saved'
      : status === 'error'
        ? 'Save failed'
        : ''

  const tone =
    status === 'error'
      ? 'bg-danger-700 text-white'
      : 'bg-success-700 text-white'

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
