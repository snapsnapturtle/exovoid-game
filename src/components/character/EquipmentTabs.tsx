import { useState } from 'react'
import { CharacterInfoPanel } from './CharacterInfoPanel'

type Tab = 'actions' | 'inventory' | 'talents' | 'cyberware' | 'background'

const TABS: { id: Tab; label: string }[] = [
  { id: 'actions', label: 'Actions' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'talents', label: 'Talents' },
  { id: 'cyberware', label: 'Cyberware' },
  { id: 'background', label: 'Background' },
]

interface EquipmentTabsProps {
  gender: string
  age: number | null
  backgroundNotes: string
  notes: string
  canEdit: boolean
  liveCanEdit: boolean
  onGenderChange: (value: string) => void
  onAgeChange: (value: number | null) => void
  onBackgroundNotesChange: (value: string) => void
  onNotesChange: (value: string) => void
}

/**
 * Right-column tabbed panel — Actions / Inventory / Talents / Cyberware /
 * Background. Most tabs are placeholders until those features land
 * (Tier 1 inventory / talents / cyberware roadmap items). Background
 * holds the existing character text fields plus the play-notes
 * scratchpad.
 */
export function EquipmentTabs({
  gender,
  age,
  backgroundNotes,
  notes,
  canEdit,
  liveCanEdit,
  onGenderChange,
  onAgeChange,
  onBackgroundNotesChange,
  onNotesChange,
}: EquipmentTabsProps) {
  const [tab, setTab] = useState<Tab>('actions')

  return (
    <div className="rounded-xl border border-void-600 bg-void-800">
      <div className="flex flex-wrap gap-1 border-b border-void-600 px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-accent-500/20 text-accent-300'
                : 'text-gray-400 hover:bg-void-700 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === 'actions' && <PlaceholderTab name="Actions" />}
        {tab === 'inventory' && <PlaceholderTab name="Inventory" />}
        {tab === 'talents' && <PlaceholderTab name="Talents" />}
        {tab === 'cyberware' && <PlaceholderTab name="Cyberware" />}
        {tab === 'background' && (
          <BackgroundTab
            gender={gender}
            age={age}
            backgroundNotes={backgroundNotes}
            notes={notes}
            canEdit={canEdit}
            liveCanEdit={liveCanEdit}
            onGenderChange={onGenderChange}
            onAgeChange={onAgeChange}
            onBackgroundNotesChange={onBackgroundNotesChange}
            onNotesChange={onNotesChange}
          />
        )}
      </div>
    </div>
  )
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="py-8 text-center text-sm text-gray-500">
      {name} not yet implemented.
    </div>
  )
}

interface BackgroundTabProps {
  gender: string
  age: number | null
  backgroundNotes: string
  notes: string
  canEdit: boolean
  liveCanEdit: boolean
  onGenderChange: (value: string) => void
  onAgeChange: (value: number | null) => void
  onBackgroundNotesChange: (value: string) => void
  onNotesChange: (value: string) => void
}

function BackgroundTab({
  gender,
  age,
  backgroundNotes,
  notes,
  canEdit,
  liveCanEdit,
  onGenderChange,
  onAgeChange,
  onBackgroundNotesChange,
  onNotesChange,
}: BackgroundTabProps) {
  return (
    <div className="space-y-4">
      <CharacterInfoPanel
        gender={gender}
        age={age}
        backgroundNotes={backgroundNotes}
        canEdit={canEdit}
        onGenderChange={onGenderChange}
        onAgeChange={onAgeChange}
        onBackgroundNotesChange={onBackgroundNotesChange}
      />
      <div className="rounded-xl border border-void-600 bg-void-800 p-4">
        <label className="mb-2 block text-sm font-medium text-gray-400">
          Play notes
        </label>
        {liveCanEdit ? (
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
            placeholder="Quick notes during play..."
            className="w-full rounded-lg border border-void-600 bg-void-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent-400 focus:outline-none"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-gray-300">
            {notes || '-'}
          </p>
        )}
      </div>
    </div>
  )
}
