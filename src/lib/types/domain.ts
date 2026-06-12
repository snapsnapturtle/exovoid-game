// ============================================================
// Application-level types: narrow JSON columns to runtime shapes.
//
// `./database` is a generated artifact — never hand-edit it; re-run
// `npm run gen:types` after a migration (see CLAUDE.md). These hand-written
// domain types layer on top of it, narrowing the `Json` columns the generator
// can't see into to their real runtime shapes. The MergeDeep-based override
// from #113 belongs here too, not in the generated file.
// ============================================================

import type { Database } from './database'

export type CharacterAttributes = {
  con: number
  str: number
  agi: number
  int: number
  edu: number
  per: number
  coo: number
}

/**
 * Flat additions to derived-stat ceilings, sourced at character creation
 * from structured background bonuses (e.g. Life Events "+1 max edge",
 * Adolescence "+1 max health"). Read by `applyPassiveEffects` and
 * attributed in the UI as "Creation bonuses" alongside talents/cyberware.
 * Missing keys default to 0.
 */
export type DerivedStatBonuses = {
  maxHealth?: number
  maxEdge?: number
  cyberImmunity?: number
}

export type TalentEntry = {
  name: string
  career: string
  tier: number
  acquiredAt: number
  granted?: boolean
}

export type CyberwareEntry = {
  name: string
  category: string
  tier: string
  installedAt: number
}

/**
 * An injury currently carried by a character. Fields are denormalized from
 * `src/data/injuries.json` so the row survives data-file evolution — same
 * pattern as talents and cyberware.
 *
 * `modifier` adds that many extra injury dice to *future* injury rolls
 * ("Every injury... modifies future injury rolls by adding more dice").
 * Cumulative across all carried injuries, treated or not: treating only
 * suppresses the immediate effect.
 */
export type InjuryEntry = {
  id: string
  name: string
  severity: number
  modifier: number
  treated: boolean
  addedAt: string
}

/**
 * A pool modifier that persists on the character until the next roll consumes
 * it (or the player removes it manually). The canonical case is the Flow
 * trigger option's "+1 pool on your next own check", which players routinely
 * forget across rolls and sessions. `source` is a free-form discriminator
 * ("trigger:flow" today; "manual", "talent:prepare", "ally:support" etc.
 * later) — keep it human-readable, the UI doesn't switch on it yet.
 */
export type PendingBonus = {
  id: string
  label: string
  modifier: number
  source: string
  addedAt: string
}

/**
 * An entry in a character's or a game's shared inventory.
 * - `catalog` items resolve stats by looking up `name` in `items.json`.
 * - `custom` items are free-text and carry their own description.
 * - `weapon` items reference `weapons.json` via `weaponRef`; `name` is the
 *   player-editable display (defaults to the rulebook's illustrative name).
 * - `armor` items reference `armors.json` via `armorRef`; same name pattern,
 *   plus a `currentDurability` per-instance state that depletes during play.
 * Future equipment types (drones) follow the same pattern.
 */
export type InventoryItem = {
  id: string
  source: 'catalog' | 'custom' | 'weapon' | 'armor'
  name: string
  description?: string
  quantity: number
  /** Free-form grouping ("backpack", "on ship") — players define their own. */
  location?: string
  /** Catalog reference for source='weapon'. */
  weaponRef?: string
  /** Catalog reference for source='armor'. */
  armorRef?: string
  /** Per-instance weapon magazine ammo (0..weapon.magazine). */
  currentAmmo?: number
  /** Per-instance armor durability that depletes during play (0..armor.durability). */
  currentDurability?: number
  /** Only meaningful for source='weapon' or 'armor' on a character (stripped on transfer to party). */
  equipped?: boolean
  /** Manufacturer name (catalog key into manufacturers.json) for source='weapon' or 'armor'. */
  manufacturerRef?: string
  /** Attached mod names. For armor: keys into armor-mods.json, gated by the armor's moddingOptions
   * and the effective mod limit. Weapon mods follow in phase B. */
  mods?: string[]
}

type CharacterRow = Database['public']['Tables']['characters']['Row']

export type Character = Omit<
  CharacterRow,
  | 'attributes'
  | 'skills'
  | 'talents'
  | 'cyberware'
  | 'inventory'
  | 'injuries'
  | 'malfunction_allocations'
  | 'pending_bonuses'
  | 'favorite_skills'
  | 'derived_stat_bonuses'
  | 'downtime_uses_used'
> & {
  attributes: CharacterAttributes
  skills: Record<string, number>
  talents: TalentEntry[]
  cyberware: CyberwareEntry[]
  inventory: InventoryItem[]
  injuries: InjuryEntry[]
  /** Cyber Malfunction Table slot numbers (2-40) the player has allocated to.
   * Length equals current excess Cyberimmunity. Each slot can be allocated at
   * most once (rulebook example). */
  malfunction_allocations: number[]
  pending_bonuses: PendingBonus[]
  /** Skill ids the owner has starred — sorted to the top of SkillsPanel. */
  favorite_skills: string[]
  derived_stat_bonuses: DerivedStatBonuses
  /** 1x-per-level downtime counter. Maps activity id → character level at
   * which it was last consumed; gated when value equals current level. */
  downtime_uses_used: Record<string, number>
}

/**
 * One participant in the current combat encounter. AP can go negative when
 * an action overspends — the excess subtracts from the next round.
 */
export type CombatParticipant = {
  characterId: string
  /** Display-name fallback for participants whose live row isn't accessible to this viewer (hidden NPCs). PC and visible-NPC names are read live from the character row at render time. */
  name: string
  /** Coolness at round-start — used for tiebreaks. */
  coolness: number
  /** Derived `actionPoints` at round-start. */
  baseAp: number
  /** 1d6 initiative roll for this round. */
  rolled: number
  /**
   * Negative AP carried over from the previous round (always ≤ 0; 0 when
   * starting fresh). Per rulebook §210: "subtract the excess Action
   * Points from their result of the following round."
   */
  apOverflow?: number
  /** Remaining AP this round. May go negative. */
  ap: number
  /** True for NPCs. Drives UI labels (NPC badge) + GM-only controls. */
  isNpc?: boolean
  /** True for minion NPCs. Drives the injury-die "minion → wound" rule. */
  isMinion?: boolean
}

export type CombatState = {
  round: number
  /** ISO timestamp of when this combat started (for audit/log purposes). */
  startedAt: string
  participants: CombatParticipant[]
}

/**
 * A pre-rolled support contribution sitting in game_state.pending_support
 * until a main roller for the matching skill absorbs it. See rulebook
 * §"Support Checks": supporters roll ceil(skill/2) aptitude dice before the
 * main check and "add all results" to the main pool. Matching is by skillId
 * alone — voice chat handles which contribution goes to whom.
 */
export type PendingSupport = {
  id: string
  /** FK into dice_rolls — the supporter's full roll row, for audit/feed links. */
  diceRollId: string
  supporterUserId: string
  /** null for GM-as-self / non-character rolls. */
  supporterCharacterId: string | null
  /** Cached display label ("Alice" — character name fallbacks to profile). */
  supporterName: string
  /** Canonical SKILLS id used for matching against the main roller's skill. */
  skillId: string
  /** Cached for UI display. */
  skillName: string
  /** Summary of rolled symbols (success, trigger, complication, botch, xp). */
  summary: Record<string, number>
  /** ISO timestamp of when the support roll committed. */
  createdAt: string
}

/**
 * One row in `character_progression`: one entry in a character's
 * progression log. The history view (#42) renders these grouped by level;
 * writers tag rows via `source` so the UI can render the right summary
 * per kind. `picks` shape is per-source:
 *   - "downtime:train-skill" → { skillId: string }
 *   - "level-up" → { skills: Record<skillId, deltaLevels>, talent:
 *      { name, career, tier } | null } (one row per level; `talent: null`
 *      means the talent point was banked. See LevelUpPicks in
 *      ~/lib/game-logic/level-up.ts.)
 */
type ProgressionRow =
  Database['public']['Tables']['character_progression']['Row']

// Mirrors the row shape directly. Per-source narrowing of `picks` lives at
// the read site (the history view in #42 will discriminate via `source`).
export type ProgressionEntry = ProgressionRow

type GameStateRow = Database['public']['Tables']['game_state']['Row']

export type GameState = Omit<
  GameStateRow,
  'inventory' | 'combat' | 'pending_support'
> & {
  inventory: InventoryItem[]
  combat: CombatState | null
  pending_support: PendingSupport[]
}
