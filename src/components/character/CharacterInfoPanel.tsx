import { useState } from 'react'
import { Button } from '~/components/ui/Button'
import { Input, Textarea } from '~/components/ui/Input'

interface CharacterInfoPanelProps {
  name: string
  /** Career is read-only post-creation — talent-tree legality is
   * derived from it, so the field is displayed but never edited here
   * (a free-text edit could leave the player with a level-up button
   * surfacing zero valid talents). Hidden when empty (NPCs). */
  career: string
  gender: string
  age: number | null
  backgroundNotes: string
  /** Root edit permission. The panel owns its own edit-mode toggle —
   * when `canEdit` is false the toggle is hidden and every field is
   * rendered as a read-only display. */
  canEdit: boolean
  deleting: boolean
  onNameChange: (value: string) => void
  onGenderChange: (value: string) => void
  onAgeChange: (value: number | null) => void
  onBackgroundNotesChange: (value: string) => void
  onDelete: () => void
}

/**
 * Background tab on the character sheet. Renders the only fields a
 * player can edit post-creation (name, gender, age, background notes)
 * plus the read-only career display. Owns its own edit-mode toggle so
 * the rest of the sheet stays a steady read-only / play-time view
 * without flipping a sheet-wide mode.
 */
export function CharacterInfoPanel({
  name,
  career,
  gender,
  age,
  backgroundNotes,
  canEdit,
  deleting,
  onNameChange,
  onGenderChange,
  onAgeChange,
  onBackgroundNotesChange,
  onDelete,
}: CharacterInfoPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const editing = canEdit && isEditing

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Background</h3>
        {canEdit && (
          <div className="flex items-center gap-3">
            {editing && (
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setIsEditing((m) => !m)}
              className="min-w-[7.5rem]"
            >
              {editing ? 'Done editing' : 'Edit'}
            </Button>
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-gray-900">Name</label>
          {editing ? (
            <Input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Character name"
              autoComplete="off"
              className="w-full"
            />
          ) : (
            <p className="text-sm text-gray-1000">{name || '-'}</p>
          )}
        </div>
        {career && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-900">Career</label>
            <p className="text-sm text-gray-1000">{career}</p>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm text-gray-900">Gender</label>
          {editing ? (
            <Input
              type="text"
              value={gender}
              onChange={(e) => onGenderChange(e.target.value)}
              placeholder="Gender"
              className="w-full"
            />
          ) : (
            <p className="text-sm text-gray-1000">{gender || '-'}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-900">Age</label>
          {editing ? (
            <Input
              type="number"
              value={age ?? ''}
              onChange={(e) =>
                onAgeChange(e.target.value ? parseInt(e.target.value) : null)
              }
              placeholder="Age"
              min={0}
              className="w-full"
            />
          ) : (
            <p className="text-sm text-gray-1000">{age ?? '-'}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-gray-900">
            Background Notes
          </label>
          {editing ? (
            <Textarea
              value={backgroundNotes}
              onChange={(e) => onBackgroundNotesChange(e.target.value)}
              rows={12}
              placeholder="Character background, motivation, personality..."
              className="w-full"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-gray-1000">
              {backgroundNotes || '-'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
