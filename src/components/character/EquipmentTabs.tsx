import { useState } from 'react'
import { CharacterInfoPanel } from './CharacterInfoPanel'
import { ActionsTab } from './ActionsTab'
import { TalentsTab } from '~/components/talents/TalentsTab'
import { CyberwareTab } from '~/components/cyberware/CyberwareTab'
import { InventoryTab } from '~/components/inventory/InventoryTab'
import type {
  CyberwareEntry,
  InventoryItem,
  TalentEntry,
} from '~/lib/types/domain'

type Tab = 'actions' | 'inventory' | 'talents' | 'cyberware' | 'background'

const TABS: { id: Tab; label: string }[] = [
  { id: 'actions', label: 'Actions' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'talents', label: 'Talents' },
  { id: 'cyberware', label: 'Cyberware' },
  { id: 'background', label: 'Background' },
]

interface EquipmentTabsProps {
  name: string
  gender: string
  age: number | null
  backgroundNotes: string
  canEdit: boolean
  talents: TalentEntry[]
  cyberware: CyberwareEntry[]
  cyberImmunityCapacity: number
  inventory: InventoryItem[]
  credits: number
  assets: number
  level: number
  career: string
  gameId: string
  characterId: string
  deleting: boolean
  onNameChange: (value: string) => void
  onGenderChange: (value: string) => void
  onAgeChange: (value: number | null) => void
  onBackgroundNotesChange: (value: string) => void
  onDelete: () => void
}

/**
 * Right-column tabbed panel — Actions / Inventory / Talents / Cyberware /
 * Background. The play-notes scratchpad lives in its own Drawer at the
 * sheet level so it stays one click away during play.
 */
export function EquipmentTabs({
  name,
  gender,
  age,
  backgroundNotes,
  canEdit,
  talents,
  cyberware,
  cyberImmunityCapacity,
  inventory,
  credits,
  assets,
  level,
  career,
  gameId,
  characterId,
  deleting,
  onNameChange,
  onGenderChange,
  onAgeChange,
  onBackgroundNotesChange,
  onDelete,
}: EquipmentTabsProps) {
  const [tab, setTab] = useState<Tab>('actions')

  return (
    <div className="rounded-xl border border-gray-400 bg-background-200">
      <div className="flex flex-wrap gap-1 border-b border-gray-400 p-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-accent-700/20 text-accent-900'
                : 'text-gray-900 hover:bg-gray-100 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-3">
        {tab === 'actions' && (
          <ActionsTab
            inventory={inventory}
            gameId={gameId}
            characterId={characterId}
            canEdit={canEdit}
          />
        )}
        {tab === 'inventory' && (
          <InventoryTab
            inventory={inventory}
            credits={credits}
            assets={assets}
            gameId={gameId}
            characterId={characterId}
          />
        )}
        {tab === 'talents' && (
          <TalentsTab
            talents={talents}
            level={level}
            career={career}
            gameId={gameId}
            characterId={characterId}
          />
        )}
        {tab === 'cyberware' && (
          <CyberwareTab
            cyberware={cyberware}
            capacity={cyberImmunityCapacity}
            gameId={gameId}
            characterId={characterId}
          />
        )}
        {tab === 'background' && (
          <BackgroundTab
            name={name}
            career={career}
            gender={gender}
            age={age}
            backgroundNotes={backgroundNotes}
            canEdit={canEdit}
            deleting={deleting}
            onNameChange={onNameChange}
            onGenderChange={onGenderChange}
            onAgeChange={onAgeChange}
            onBackgroundNotesChange={onBackgroundNotesChange}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="py-8 text-center text-sm text-gray-700">
      {name} not yet implemented.
    </div>
  )
}

interface BackgroundTabProps {
  name: string
  career: string
  gender: string
  age: number | null
  backgroundNotes: string
  canEdit: boolean
  deleting: boolean
  onNameChange: (value: string) => void
  onGenderChange: (value: string) => void
  onAgeChange: (value: number | null) => void
  onBackgroundNotesChange: (value: string) => void
  onDelete: () => void
}

function BackgroundTab({
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
}: BackgroundTabProps) {
  return (
    <CharacterInfoPanel
      name={name}
      career={career}
      gender={gender}
      age={age}
      backgroundNotes={backgroundNotes}
      canEdit={canEdit}
      deleting={deleting}
      onNameChange={onNameChange}
      onGenderChange={onGenderChange}
      onAgeChange={onAgeChange}
      onBackgroundNotesChange={onBackgroundNotesChange}
      onDelete={onDelete}
    />
  )
}
