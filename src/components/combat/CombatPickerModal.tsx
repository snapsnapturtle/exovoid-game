import { useMemo, useState } from 'react'
import { Modal } from '~/components/ui/Modal'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Alert } from '~/components/ui/Alert'
import { CharacterPortrait } from '~/components/character/CharacterPortrait'
import type { Character } from '~/lib/types/database'

interface CombatPickerModalProps {
  title: string
  /** All characters the caller can possibly add (RLS-filtered, no NPCs
   * they can't see). The modal further filters out anyone already in
   * `excludeIds`. */
  characters: Character[]
  excludeIds: Set<string>
  /** Initial checked state. Used to pre-tick PCs when starting combat. */
  defaultChecked: (c: Character) => boolean
  /** Whether the caller can pick a character at all. For non-GM joiners
   * this is true only for their own PCs / controlled NPCs. */
  canPick: (c: Character) => boolean
  confirmLabel: string
  busy: boolean
  onClose: () => void
  onSubmit: (ids: string[]) => Promise<void> | void
}

/**
 * Shared picker for "start combat" and "join combat" flows. Two sections —
 * Player characters and NPCs — each with a Select-all toggle at the
 * section header. Characters already in the combat (or otherwise excluded)
 * are hidden; uncheckable rows are not rendered (no need to show characters
 * the caller can't add).
 */
export function CombatPickerModal({
  title,
  characters,
  excludeIds,
  defaultChecked,
  canPick,
  confirmLabel,
  busy,
  onClose,
  onSubmit,
}: CombatPickerModalProps) {
  const candidates = useMemo(
    () => characters.filter((c) => !excludeIds.has(c.id) && canPick(c)),
    [characters, excludeIds, canPick],
  )
  const pcs = candidates.filter((c) => !c.is_npc)
  const npcs = candidates.filter((c) => c.is_npc)

  const [picked, setPicked] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const c of candidates) if (defaultChecked(c)) initial.add(c.id)
    return initial
  })
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function selectAll(rows: Character[]) {
    setPicked((prev) => {
      const next = new Set(prev)
      for (const c of rows) next.add(c.id)
      return next
    })
  }
  function clearGroup(rows: Character[]) {
    setPicked((prev) => {
      const next = new Set(prev)
      for (const c of rows) next.delete(c.id)
      return next
    })
  }

  async function submit() {
    if (picked.size === 0) {
      setError('Pick at least one character.')
      return
    }
    setError(null)
    await onSubmit(Array.from(picked))
  }

  const hasAny = candidates.length > 0

  return (
    <Modal
      onClose={onClose}
      size="md"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !hasAny}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      {!hasAny && (
        <p className="py-4 text-center text-sm text-gray-700">
          No characters available to add.
        </p>
      )}
      <div className="space-y-5">
        <Section
          label="Player characters"
          empty="No PCs in this game."
          rows={pcs}
          picked={picked}
          onToggle={toggle}
          onSelectAll={() => selectAll(pcs)}
          onClear={() => clearGroup(pcs)}
        />
        <Section
          label="NPCs"
          empty="No NPCs available."
          rows={npcs}
          picked={picked}
          onToggle={toggle}
          onSelectAll={() => selectAll(npcs)}
          onClear={() => clearGroup(npcs)}
        />
      </div>
    </Modal>
  )
}

interface SectionProps {
  label: string
  empty: string
  rows: Character[]
  picked: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
}

function Section({
  label,
  empty,
  rows,
  picked,
  onToggle,
  onSelectAll,
  onClear,
}: SectionProps) {
  if (rows.length === 0) {
    return (
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-900">
          {label}
        </h3>
        <p className="text-xs text-gray-700">{empty}</p>
      </section>
    )
  }
  const pickedInGroup = rows.filter((r) => picked.has(r.id)).length
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-900">
          {label}{' '}
          <span className="ml-1 text-gray-700">
            {pickedInGroup}/{rows.length}
          </span>
        </h3>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={pickedInGroup === rows.length}
            className="rounded px-2 py-0.5 text-gray-900 transition not-disabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            All
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={pickedInGroup === 0}
            className="rounded px-2 py-0.5 text-gray-900 transition not-disabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            None
          </button>
        </div>
      </div>
      <ul className="space-y-1.5">
        {rows.map((c) => {
          const isPicked = picked.has(c.id)
          return (
            <li key={c.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition ${
                  isPicked
                    ? 'border-accent-700 bg-accent-700/10'
                    : 'border-gray-400 hover:border-accent-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isPicked}
                  onChange={() => onToggle(c.id)}
                  className="h-4 w-4 rounded border-gray-400 bg-gray-100 text-accent-700 focus:ring-accent-900"
                />
                <CharacterPortrait
                  name={c.name}
                  portraitUrl={c.portrait_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-white">
                      {c.name}
                    </span>
                    {c.is_minion && (
                      <Badge tone="warning" uppercase pill>
                        Minion
                      </Badge>
                    )}
                    {c.is_npc && !c.visible_to_players && (
                      <Badge tone="neutral" uppercase pill>
                        Hidden
                      </Badge>
                    )}
                  </div>
                </div>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
