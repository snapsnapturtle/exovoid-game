// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { Character } from '~/lib/types/database'

vi.mock('~/lib/server/characters', () => ({
  updateCharacter: vi.fn(async () => ({})),
}))

import { useCharacter } from './useCharacter'
import { updateCharacter } from '~/lib/server/characters'

const updateCharacterMock = vi.mocked(updateCharacter)

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    user_id: 'user-1',
    game_id: 'game-1',
    name: 'Test',
    career: 'Space Marine',
    level: 1,
    experience: 0,
    gender: '',
    age: null,
    background_notes: '',
    notes: '',
    portrait_url: null,
    edge_current: 0,
    health_current: null,
    credits: 0,
    assets: 0,
    is_npc: false,
    is_minion: false,
    visible_to_players: true,
    controller_user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    attributes: { con: 4, str: 4, agi: 4, int: 4, edu: 4, per: 4, coo: 4 },
    skills: {},
    talents: [],
    cyberware: [],
    inventory: [],
    injuries: [],
    malfunction_allocations: [],
    pending_bonuses: [],
    favorite_skills: [],
    derived_stat_bonuses: {},
    downtime_uses_used: {},
    ...overrides,
  }
}

describe('useCharacter', () => {
  beforeEach(() => {
    updateCharacterMock.mockClear()
  })

  // Regression: the level-up wizard does
  //   onUpdateField('skills', …)
  //   onUpdateField('talents', …)
  //   await flushSave()
  // — and before the bug fix, pendingRef + latestRef were mutated inside
  // a setCharacter updater, which React doesn't run synchronously across
  // await boundaries. flushSave's early-return saw pendingRef = false and
  // skipped the save entirely; the writes only landed 800ms later via
  // the regular debounce, by which point router.invalidate() had already
  // re-fetched stale data. This test ensures flushSave actually persists
  // the merged snapshot after multiple synchronous mutators.
  it('flushSave persists both fields after two synchronous updateField calls', async () => {
    const initial = makeCharacter()
    const { result } = renderHook(() => useCharacter(initial, true))

    const newSkills = { firearms: 5 }
    const newTalents = [
      {
        name: 'Training: Agility',
        career: 'Space Marine',
        tier: 4,
        acquiredAt: 2,
      },
    ]

    await act(async () => {
      result.current.updateField('skills', newSkills)
      result.current.updateField('talents', newTalents)
      await result.current.flushSave()
    })

    expect(updateCharacterMock).toHaveBeenCalledTimes(1)
    const payload = updateCharacterMock.mock.calls[0][0].data.updates
    expect(payload.skills).toEqual(newSkills)
    expect(payload.talents).toEqual(newTalents)
  })

  it('flushSave is a no-op when nothing is pending', async () => {
    const initial = makeCharacter()
    const { result } = renderHook(() => useCharacter(initial, true))

    await act(async () => {
      await result.current.flushSave()
    })

    expect(updateCharacterMock).not.toHaveBeenCalled()
  })

  it('updateField composes the latest snapshot across calls (second sees first)', async () => {
    const initial = makeCharacter()
    const { result } = renderHook(() => useCharacter(initial, true))

    await act(async () => {
      result.current.updateField('name', 'Alice')
      result.current.updateField('experience', 10)
      await result.current.flushSave()
    })

    const payload = updateCharacterMock.mock.calls[0][0].data.updates
    expect(payload.name).toBe('Alice')
    expect(payload.experience).toBe(10)
    // Level should derive from XP (10 = level 2 per XP_THRESHOLDS).
    expect(payload.level).toBe(2)
  })

  // Regression: pre-fix, performSave caught errors and only set
  // saveStatus='error', so `await flushSave()` always resolved
  // successfully even when updateCharacter rejected. The level-up
  // wizard then proceeded to recordProgression, committing a row
  // whose picks were never actually applied to the character — a
  // permanent drift between the log and the sheet. flushSave must
  // propagate the rejection so awaited callers can branch on it.
  it('flushSave rejects when the underlying save fails', async () => {
    updateCharacterMock.mockRejectedValueOnce(new Error('network down'))
    const initial = makeCharacter()
    const { result } = renderHook(() => useCharacter(initial, true))

    await act(async () => {
      result.current.updateField('name', 'Alice')
    })
    await expect(result.current.flushSave()).rejects.toThrow('network down')
    expect(updateCharacterMock).toHaveBeenCalledTimes(1)
  })
})
