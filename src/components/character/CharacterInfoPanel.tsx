import { Input, Textarea } from '~/components/ui/Input'

interface CharacterInfoPanelProps {
  gender: string
  age: number | null
  backgroundNotes: string
  canEdit: boolean
  onGenderChange: (value: string) => void
  onAgeChange: (value: number | null) => void
  onBackgroundNotesChange: (value: string) => void
}

export function CharacterInfoPanel({
  gender,
  age,
  backgroundNotes,
  canEdit,
  onGenderChange,
  onAgeChange,
  onBackgroundNotesChange,
}: CharacterInfoPanelProps) {
  return (
    <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Character Info</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-900">Gender</label>
          {canEdit ? (
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
          {canEdit ? (
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
          {canEdit ? (
            <Textarea
              value={backgroundNotes}
              onChange={(e) => onBackgroundNotesChange(e.target.value)}
              rows={3}
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
