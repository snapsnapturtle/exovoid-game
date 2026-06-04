import { useEffect, useState } from 'react'
import { updateNpcFlags } from '~/lib/server/npcs'
import { Select } from '~/components/ui/Input'
import { Badge } from '~/components/ui/Badge'

interface NpcSheetControlsProps {
  characterId: string
  isMinion: boolean
  visibleToPlayers: boolean
  controllerUserId: string | null
  canManageFlags: boolean
  /** Game members. The GM gets folded into the "GM" sentinel
   * (controller_user_id = null) and so is hidden from this list. */
  members: {
    user_id: string
    role: string
    profiles: { display_name: string } | null
  }[]
}

/**
 * Chrome strip on top of the NPC sheet — minion / visibility / controller
 * controls. Distinct from the regular sheet header (which carries name,
 * portrait, XP). The fields here change behaviour, not stats:
 *   - Minion → injury rolls against this NPC count "minion" symbols as wounds.
 *   - Visibility → players see this NPC at all (read-only sheet when on).
 *   - Controller → reassigns the NPC. Whoever the controller field points
 *     to has *every* right on the NPC (banner, stats, delete); the GM is
 *     always also allowed within their own game.
 *
 * `canManageFlags` mirrors the RLS UPDATE policy: GM-of-game OR the current
 * controller. The previous controller loses every right the moment they
 * hand the NPC off, including the ability to reclaim it — only the new
 * controller or the GM can reassign back.
 */
export function NpcSheetControls({
  characterId,
  isMinion,
  visibleToPlayers,
  controllerUserId,
  canManageFlags,
  members,
}: NpcSheetControlsProps) {
  const [minion, setMinion] = useState(isMinion)
  const [visible, setVisible] = useState(visibleToPlayers)
  const [controller, setController] = useState<string | null>(controllerUserId)
  const [pending, setPending] = useState(false)

  // Sync local state with prop updates (realtime — another client changed
  // the row, or the loader re-ran after the form invalidated the router).
  useEffect(() => setMinion(isMinion), [isMinion])
  useEffect(() => setVisible(visibleToPlayers), [visibleToPlayers])
  useEffect(() => setController(controllerUserId), [controllerUserId])

  async function save(updates: {
    is_minion?: boolean
    visible_to_players?: boolean
    controller_user_id?: string | null
  }) {
    setPending(true)
    try {
      await updateNpcFlags({ data: { characterId, updates } })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-400 bg-gray-200 px-5 py-3 text-sm text-gray-1000">
      <Badge tone="purple" size="sm" uppercase pill>
        NPC
      </Badge>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={minion}
          disabled={!canManageFlags || pending}
          onChange={(e) => {
            setMinion(e.target.checked)
            save({ is_minion: e.target.checked })
          }}
          className="h-4 w-4 rounded border-gray-400 bg-gray-100 text-accent-700 focus:ring-accent-900 disabled:opacity-40"
        />
        Minion
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={visible}
          disabled={!canManageFlags || pending}
          onChange={(e) => {
            setVisible(e.target.checked)
            save({ visible_to_players: e.target.checked })
          }}
          className="h-4 w-4 rounded border-gray-400 bg-gray-100 text-accent-700 focus:ring-accent-900 disabled:opacity-40"
        />
        Visible to players
      </label>
      <label className="inline-flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-900">
          Controller
        </span>
        <Select
          size="sm"
          value={controller ?? ''}
          disabled={!canManageFlags || pending}
          onChange={(e) => {
            const value = e.target.value || null
            setController(value)
            save({ controller_user_id: value })
          }}
          className="w-auto"
        >
          {(() => {
            const gm = members.find((m) => m.role === 'gm')
            const gmName = gm?.profiles?.display_name || 'GM'
            return <option value="">{gmName} (GM)</option>
          })()}
          {members
            .filter((m) => m.role !== 'gm')
            .map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profiles?.display_name || 'Unknown'}
              </option>
            ))}
        </Select>
      </label>
    </div>
  )
}
