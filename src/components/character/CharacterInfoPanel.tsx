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
      <h3 className="mb-4 text-lg font-semibold text-white">
        Character Info
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-900">Gender</label>
          {canEdit ? (
            <input
              type="text"
              value={gender}
              onChange={(e) => onGenderChange(e.target.value)}
              className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
              placeholder="Gender"
            />
          ) : (
            <p className="text-sm text-gray-1000">{gender || '-'}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-900">Age</label>
          {canEdit ? (
            <input
              type="number"
              value={age ?? ''}
              onChange={(e) =>
                onAgeChange(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
              placeholder="Age"
              min={0}
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
            <textarea
              value={backgroundNotes}
              onChange={(e) => onBackgroundNotesChange(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-white placeholder-gray-700 focus:border-accent-900 focus:outline-none"
              placeholder="Character background, motivation, personality..."
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
