# Exovoid Companion App — Roadmap

A tiered list of features needed to bring the app from "character sheet viewer" to a usable TTRPG companion. Tier 1 is the MVP play loop — once it's complete we'll run a first test session and re-evaluate the rest.

## Tier 1 — Core play loop (MVP)

- [x] **Realtime sync foundation** — `useRealtimeSubscription` primitive + character row sync (`useRealtimeCharacter`). Cross-tab character edits propagate live. Lobby-level live updates deferred (see Tier 3).
- [x] **Dice rolling UI + resolution** — Roll button per skill row opens a modal with pool + difficulty + GM-only hidden toggle. Server rolls and persists; raw symbol counts shown (no auto-conversion of triggers/complications).
- [x] **Shared dice roll feed** — right-side panel in `GameLayout` shows recent rolls live via realtime; click for per-die details. Hidden GM rolls visible only to inserter via RLS.
- [ ] **Live play panel** — quick-adjust health / edge / AP / counters, separate from the editor view.
- [ ] **Active conditions panel** — manually toggled on/off, persistently visible while active, modify dice rolls and derived stats while on.
- [ ] **Per-character counters** — ammo, charges, drug doses, etc.
- [ ] **Talents panel (action cards)** — list + use button → pre-fills dice roller.
- [ ] **Cyberware panel (action cards)** — same pattern, plus passive modifiers to derived stats.
- [ ] **Inventory / equipment panel** — equip toggle; equipped weapons render as action cards, equipped armor modifies stats.

### Cross-cutting prerequisites for Tier 1

- [ ] **Data import** for talents, cyberware, and equipment from Google Sheets. The Tier 1 panels render shells without this — at minimum talents and cyberware are needed to make them functional.
- [ ] **Action card component** — shared pattern reused by talents / cyberware / weapons. Design once.

## Tier 2 — Important, post-MVP

- [ ] **Combat tracker** — initiative order, turn marker, per-character AP.
- [ ] **Level-up wizard + progression history** — guided legal-choice flow, writes to a `character_progression` table keyed by level. Also tracks 1x-per-level downtime ability uses.
- [ ] **Character creation validation** — verify 28-point budget, creation caps, and starter skill rules are enforced.
- [ ] **NPC management** — lightweight sheet (name, key stats, health/AP, notes), GM-only. Not a full character sheet.
- [ ] **GM party overview dashboard** — single panel showing all PCs' health / edge / AP / conditions live.
- [ ] **Shared notes UI** — table and RLS are ready, needs a route + component.
- [ ] **Rules reference / glossary tooltips** — hover-defs for game terms (Trigger, Complication, etc.) and skills.
- [ ] **Character portrait upload** — Supabase Storage.
- [ ] **Hidden rolls for players** — let players (not just the GM) toggle a roll as hidden, with the result visible to the roller and the GM only (other players don't see it). Useful for investigation, stealth and similar private checks. Requires a small RLS amendment on `dice_rolls` to also exempt the game's GM from the hidden filter, plus dropping the `isGm` gate on the `DiceRoller` toggle.

## Tier 3 — System completeness

- [ ] **Spaceship combat** — separate subsystem. The open design question is how to model ship state and flow its effects into character actions/rolls.
- [ ] **Environmental hazards** — hunger / radiation / heat / cold / vacuum tracking.
- [ ] **Downtime activities** — crafting, repair. (1x-per-level uses are already covered by the progression log from the level-up item.)
- [ ] **Support / collaborative checks** — multi-player roll aggregation.
- [ ] **Homebrew content** — GM-defined custom talents / cyberware / equipment.
- [ ] **Live lobby updates** — new players joining and new characters being created should appear in the lobby without a manual refresh. Initial attempt (subscriptions filtered by `game_id` with `router.invalidate()` on change) didn't deliver events even after setting `REPLICA IDENTITY FULL` on the affected tables. Subsequent docs review (https://supabase.com/docs/guides/realtime/postgres-changes) clarifies that REPLICA IDENTITY FULL only matters for receiving the `old` record on UPDATE/DELETE — it isn't the fix here. Two viable paths to revisit:
  - **Switch lobby signaling to Realtime broadcast** (same pattern that fixed the dice feed). Most reliable; bypasses RLS/replica-identity entirely.
  - **Explicitly call `supabase.realtime.setAuth(session.access_token)`** on the browser client after the session loads (and on token refresh). The Supabase docs imply auto-sync isn't guaranteed; explicit auth would unblock postgres_changes for cookie-based SSR sessions and is the more native fix.
- [ ] **Explicit realtime auth on the browser client** — extend `getSupabaseBrowserClient` to call `supabase.realtime.setAuth(...)` with the current session's access token (and re-call on `onAuthStateChange`). Likely prerequisite for any future postgres_changes use — without it, RLS on the realtime side may evaluate as anon and silently drop events for non-inserter clients.

## Suggested Tier 1 sequencing

Realtime foundation → dice + feed → live play + conditions + counters → data import → action card panels (talents / cyberware / inventory). At that point the app is playable for a first test.

## Key design decisions

- **Progression granularity**: tracked per level, not per edit. Captures level-up choices and 1x-per-level downtime ability uses. Light, story-shaped, not an audit trail.
- **Active effects**: manually toggled by the player. Must be visibly persistent so they don't get forgotten. While on, automatically apply to dice rolls and derived stats.
- **NPCs**: lightweight, not full character sheets. GM-only.
- **Action cards**: unified pattern across talents / cyberware / equipped weapons — single "use" button that pre-fills the dice roller.
- **Out of scope for now**: tactical maps / encounter builder, marketplace, PDF export, character templates, per-session roll log.
