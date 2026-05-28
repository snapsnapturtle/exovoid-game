import { createContext, useContext, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Character } from '~/lib/types/database'
import type { AppliedPassiveEffects } from '~/lib/game-logic/passive-effects'
import {
  DOWNTIME_ACTIVITIES,
  isActivityAvailable,
  type DowntimeActivity,
} from '~/lib/game-logic/downtime'
import { Modal } from '~/components/ui/Modal'
import { Button } from '~/components/ui/Button'
import { RelaxAndRest } from './RelaxAndRest'
import { SeekInspiration } from './SeekInspiration'
import { TrainSkill } from './TrainSkill'
import { TechCheckActivity } from './TechCheckActivity'
import { Networking } from './Networking'
import { ForgeId } from './ForgeId'

// Footer portal slot. Activity body components render inside the Modal body,
// but their apply/confirm button needs to live in the Modal footer next to
// the "Back" affordance. The portal target is the inner div ref below; an
// activity calls `useDowntimeFooterTarget()` and `createPortal`s into it.
const DowntimeFooterContext = createContext<HTMLElement | null>(null)
export function useDowntimeFooterTarget() {
  return useContext(DowntimeFooterContext)
}

interface DowntimeModalProps {
  character: Character
  effects: AppliedPassiveEffects
  gameId: string
  characterId: string
  onClose: () => void
  onUpdateField: <K extends keyof Character>(
    key: K,
    value: Character[K],
  ) => void
}

type View = { kind: 'list' } | { kind: 'activity'; activityId: string }

export function DowntimeModal({
  character,
  effects,
  gameId,
  characterId,
  onClose,
  onUpdateField,
}: DowntimeModalProps) {
  const [view, setView] = useState<View>({ kind: 'list' })
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  function choose(activity: DowntimeActivity) {
    if (activity.id === 'install-cyberware') {
      onClose()
      void navigate({
        to: '/games/$gameId/characters/$characterId/cyberware',
        params: { gameId, characterId },
      })
      return
    }
    setView({ kind: 'activity', activityId: activity.id })
  }

  const activeActivity =
    view.kind === 'activity'
      ? (DOWNTIME_ACTIVITIES.find((a) => a.id === view.activityId) ?? null)
      : null

  return (
    <Modal
      onClose={onClose}
      size="md"
      title={
        view.kind === 'list'
          ? 'Downtime activities'
          : (activeActivity?.name ?? 'Downtime')
      }
      subtitle={
        view.kind === 'list'
          ? 'Pick an activity to perform during this downtime.'
          : undefined
      }
      footer={
        view.kind === 'activity' ? (
          <>
            <Button variant="ghost" onClick={() => setView({ kind: 'list' })}>
              Back
            </Button>
            {/* Portal target — activity components render their apply button
                into this slot via `useDowntimeFooterTarget()`. `display:
                contents` so portaled children become direct flex children of
                the Modal footer container. */}
            <div ref={setFooterEl} className="contents" />
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <DowntimeFooterContext.Provider value={footerEl}>
        {view.kind === 'list' && (
          <ActivityList character={character} onChoose={choose} />
        )}
        {view.kind === 'activity' && activeActivity && (
          <ActivityDispatcher
            activity={activeActivity}
            character={character}
            effects={effects}
            gameId={gameId}
            characterId={characterId}
            onCloseAll={onClose}
            onUpdateField={onUpdateField}
          />
        )}
      </DowntimeFooterContext.Provider>
    </Modal>
  )
}

function ActivityList({
  character,
  onChoose,
}: {
  character: Character
  onChoose: (a: DowntimeActivity) => void
}) {
  return (
    <ul className="space-y-2">
      {DOWNTIME_ACTIVITIES.map((activity) => {
        const available = isActivityAvailable(activity, character)
        const lastUsedAt = character.downtime_uses_used[activity.id]
        return (
          <li
            key={activity.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-gray-400 bg-background-100 p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-white">{activity.name}</h4>
                {activity.oncePerLevel && (
                  <span className="rounded-md border border-gray-400 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-1000">
                    1× per level
                  </span>
                )}
                {!available && lastUsedAt != null && (
                  <span className="text-[10px] uppercase tracking-wide text-gray-700">
                    Used at level {lastUsedAt}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-1000">
                {activity.description}
              </p>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => onChoose(activity)}
              disabled={!available}
              title={
                available
                  ? `Start ${activity.name}`
                  : `Already used at level ${lastUsedAt}`
              }
            >
              Choose
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

interface DispatcherProps {
  activity: DowntimeActivity
  character: Character
  effects: AppliedPassiveEffects
  gameId: string
  characterId: string
  onCloseAll: () => void
  onUpdateField: <K extends keyof Character>(
    key: K,
    value: Character[K],
  ) => void
}

function ActivityDispatcher(props: DispatcherProps) {
  switch (props.activity.id) {
    case 'relax-and-rest':
      return (
        <RelaxAndRest
          character={props.character}
          effects={props.effects}
          onCloseAll={props.onCloseAll}
          onUpdateField={props.onUpdateField}
        />
      )
    case 'seek-inspiration':
      return (
        <SeekInspiration
          character={props.character}
          effects={props.effects}
          onCloseAll={props.onCloseAll}
          onUpdateField={props.onUpdateField}
        />
      )
    case 'train-skill':
      return (
        <TrainSkill
          character={props.character}
          onCloseAll={props.onCloseAll}
          onUpdateField={props.onUpdateField}
        />
      )
    case 'modify-gear':
    case 'repair-gear':
      return (
        <TechCheckActivity
          activity={props.activity}
          character={props.character}
          effects={props.effects}
          gameId={props.gameId}
          characterId={props.characterId}
          onCloseAll={props.onCloseAll}
          onUpdateField={props.onUpdateField}
        />
      )
    case 'networking':
      return (
        <Networking
          character={props.character}
          effects={props.effects}
          gameId={props.gameId}
          characterId={props.characterId}
          onCloseAll={props.onCloseAll}
          onUpdateField={props.onUpdateField}
        />
      )
    case 'forge-id':
      return (
        <ForgeId
          character={props.character}
          effects={props.effects}
          gameId={props.gameId}
          characterId={props.characterId}
          onCloseAll={props.onCloseAll}
          onUpdateField={props.onUpdateField}
        />
      )
    default:
      return (
        <p className="text-sm text-gray-700">
          This activity isn't implemented yet.
        </p>
      )
  }
}
