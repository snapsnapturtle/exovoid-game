# Exovoid Companion App — Roadmap

A tiered list of features needed to bring the app from "character sheet viewer" to a usable TTRPG companion. Tier 1 is the MVP play loop — once it's complete we'll run a first test session and re-evaluate the rest.

## Tier 1 — Core play loop (MVP)

- [x] **Realtime sync foundation** — `useRealtimeSubscription` primitive + character row sync (`useRealtimeCharacter`). Cross-tab character edits propagate live. Lobby-level live updates deferred (see Tier 3).
- [x] **Dice rolling UI + resolution** — Roll button per skill row opens a modal with pool + difficulty + GM-only hidden toggle. Server rolls and persists; raw symbol counts shown (no auto-conversion of triggers/complications).
- [x] **Shared dice roll feed** — right-side panel in `GameLayout` shows recent rolls live via realtime; click for per-die details. Hidden GM rolls visible only to inserter via RLS.
- [x] **Live play panel + edit/play mode split** — character sheet now has a play mode (default, locks attributes / skills / info / background) and an edit mode (toggled via the header button, only available to `canEdit` users). A `LivePlayPanel` at the top of the sheet has big +/- trackers for health and edge plus a per-session notes scratchpad — always editable when the user has permission, regardless of mode. AP and ammo / charges / drug doses moved to the combat tracker scope.
- [x] **Structured talent effects (character-level passives)** — `talents.json` annotated with discriminated-union `effects` arrays; `applyPassiveTalentEffects()` layers on top of `computeAllDerivedStats` so passive bonuses reflect on the sheet automatically. Shipped batch: Training: Agility / Constitution / Coolness / Education / Intelligence / Personality / Strength (each +1 attr), Iron Skin (+1 soak / +4 HP), Resourceful (+3 max edge), Sprinter (+3 speed), Cyberadaption Training (+4 cyber immunity), Jack Of All Trades (+1 max edge — passive part only). Cap-at-8 fallback and subsystem-pending effects still TODO (see below).
- [ ] ~~**Active conditions panel**~~ — dropped from v1. The DiceRoller already has a free-form modifier field, which covers the ad-hoc penalty/bonus need without needing a persistent toggle list. The named conditions worth tracking persistently (Hungry, Hypothermia, Radiation Poisoning etc.) are all Survival Clock escalation states and live with that work in Tier 3.
- [ ] ~~**Per-character counters**~~ — moved to the combat tracker (below): ammo / charges / drug doses are combat-adjacent.

### Tier 1 sequencing — the path to first playtest

The remaining Tier 1 items are ordered as the work needs to happen. Each is a precondition for what follows; don't shuffle without thinking about the dependency.

- [ ] ~~**(1) Action card component**~~ — was meant as a precondition for cyberware + equipment, but the cyberware panel landed without a formalized shared component (per-domain rows worked fine). Let the abstraction emerge when there's a real third consumer (likely with the Tier 2 talent "use" button) rather than designing it in a vacuum.
- [x] **(2) Cyberware data import + Cyberware panel** — `/cyberware` management page with category cards, occupation budget, install/replace/uninstall; passive cyberware effects auto-apply via the generalized `applyPassiveEffects` pipeline; Cyber Malfunction Table allocation modal for overload (rulebook §"Exceeding Cyber Immunity"). Malfunction *trigger* on injuries stays manual at the table — see deferred section.
- [ ] **(3a) Inventory & economy** — personal and group inventories with character-defined location groupings ("backpack", "on ship", custom). Items either picked from the imported catalog or added as free-text entries (name + optional description), with quantity. Movable between character and group. Credits and assets at both character and group level.
- [ ] **(3b) Equipment — weapons + armor** — separate from generic inventory. Equip toggle; equipped weapons render as action-card-style rows on the sheet (second consumer of the pattern after cyberware — the shared component, if any, can be extracted here). Equipped armor closes the `soak: 0` hardcode in `computeAllDerivedStats`. Excludes mods.
- [ ] **(3c) Weapon / armor / drone mods** — modular attachments with their own requirements and effects. Cleanest after equipment works without them; mods land as the next layer.
- [ ] **(4) Combat tracker** — initiative order (1d6 + AP per round per §196), turn marker, per-character AP, per-character ammo / charges / drug doses (combat-scoped resources), all live via realtime. **Promoted from Tier 2**: combat is the dominant mechanical activity in Exovoid and the first playtest is not viable on this app without it — otherwise the table falls back to paper for AP/initiative and the tool collapses to "fancy character sheet + dice."
- [ ] **(5) Character creation validation** — verify the 28-point attribute budget (§162), creation caps (max 6 on three attributes, 4 on the others), and starter skill rules (no skill above 6, level 5+ costs 2 each per §176). **Promoted from Tier 2**: the wizard currently produces illegal characters, which means rule arguments at the table during the first playtest.

### Deferred Tier 1 work — refinements, not capability gaps

Useful but not on the critical path to a playable session. The capability they enforce already exists via simpler mechanisms.

- [ ] **Custom equipment (player-defined weapons / armor)** — items that behave like catalog weapons or armor (with stats, qualities, and mod slots) but are authored by the player or GM directly. Free-text inventory entries are already in 3a; this is the harder case of homebrewed *equipment* that flows into combat. Likely lands alongside Tier 3 homebrew content.
- [ ] **Cyber malfunction auto-trigger** — currently the player rolls 2d20 manually on a cyberware injury symbol and compares against their allocated slots (the modal explains this). Auto-rolling and applying the outcome on injury rolls is a polish layer that lands with combat / injury work if useful — for first playtest the table can resolve this verbally.
- [ ] **Structured background bonus application** — parse the textual bonuses in `backgrounds.json` ("Gain the Danger Sense talent", "Gain one Tier-0 talent from the Field Medic or Criminal careers", "+1 to one attribute of your choice") into typed bonus shapes and apply them during the creation wizard's background step. Capability is already covered by the manual-add escape hatch — this item is about enforcement/correctness, and removes the need for that escape hatch.
- [ ] ~~**Manual talent add (escape hatch)**~~ — temporary affordance on `/talents` to add any talent by name, bypassing budget and tier prereqs. Marked `granted: true` so it doesn't consume a talent point. **Remove once structured background bonus application ships** — at that point all talents the character should have will arrive through proper channels.
- [ ] **Subsystem-pending talent effects** — passive talents whose effects modify subsystems the app doesn't yet have. Annotate each as part of building the relevant subsystem so we don't drift out of sync with the rulebook. Tracking list:
  - **Cyberware system**: Synergetic Installation (-25% occupation), Cybernetic Maintenance (-1 difficulty to repair cyberware)
  - **Armor system**: Second Skin (ignore speed penalty, +25% durability), Impenetrable Shell (halve Penetrating / Shredding against you)
  - **Firearms / combat AP**: Far Shot (+30% range), Quick Reload (-1 AP), Recoil Control (-40% ammo on burst), Tactical Advance (free movement on fire), Gun Nut (-1 difficulty modify)
  - **Drones**: Minion Master (+1 / +1 AI), Drone Fixer (-1 difficulty + half resources to repair)
  - **Economy / items**: Haggler (-20% cost), Merchant's Guild (rarity -2, +10% discount), Salvager (half repair materials)
  - **Vehicles**: Vehicle Specialization (+2 pool for chosen vehicle type)

## Tier 2 — Important refinements after the first playtest

Informed by what the first playtest actually breaks. Best guesses today:

- [ ] **Talent action cards / "use" button** — per-talent "use" affordance on the sheet itself, first consumer of the action-card component for the ~80 activated talents. Deferred from Tier 1 because talents are mechanically varied (skill+difficulty pre-fills, AP spends, per-session counters, attack-roll modifiers) and shipping a clean card for each shape is more work than the first playtest needs — players can invoke talents manually from the description text at the table.
- [ ] **Conditional roll modifiers** — pool / difficulty modifiers gated by a situation (Tracker, Living Shadow, Quickfingers, Climber, Lockpicker, Saboteur, Spy, Surgeon, etc.). Once they exist as opt-in toggles in the DiceRoller, the corresponding talents stop being indistinguishable from description text. Deferred from Tier 1 alongside the talent action-cards work.
- [ ] **Triggered / per-X-session actions** — the ~80 talents that fire on AP spend, per session, or per encounter (Combat Clarity, Anticipation, Heavy Blow, Riposte, etc.). Richer state (per-session counters, AP-spend hooks) builds on the talent action-card work above.
- [ ] **Level-up wizard + progression history** — guided legal-choice flow, writes to a `character_progression` table keyed by level. Also tracks 1x-per-level downtime ability uses.
- [ ] **NPC management** — lightweight sheet (name, key stats, health/AP, notes), GM-only. Not a full character sheet. Likely conjoined with the combat tracker (NPCs need initiative + AP too).
- [ ] **GM party overview dashboard** — single panel showing all PCs' health / edge / AP / conditions live. Removes the need to page between sheets during a session.
- [ ] **Hidden rolls for players** — let players (not just the GM) toggle a roll as hidden, with the result visible to the roller and the GM only. Requires a small RLS amendment on `dice_rolls` to also exempt the game's GM from the hidden filter, plus dropping the `isGm` gate on the `DiceRoller` toggle.
- [ ] **Shared notes UI** — table and RLS are ready, needs a route + component.
- [ ] **Play notes drawer** — promote the per-character play notes out of the Background tab where they're effectively buried. A small floating button at the top of the character sheet opens the notes as a side drawer so the player can jot during play without leaving the sheet view. Same content as today's textarea, just always one click away.
- [ ] **Rules reference / glossary tooltips** — hover-defs for game terms (Trigger, Complication, etc.) and skills.
- [ ] **Per-route page titles** — every route should set a `head: () => ({ meta: [{ title: '… — Exovoid' }] })` so the browser tab reflects the page (currently only the root title is set, and `/styleguide`). Cheap to do but needs a sweep of every route in `src/routes/` to pick a sensible title for each (Dashboard, Game lobby, Character sheet incl. character name, Combat, Inventory, Cyberware, Talents, Login/Signup, etc.).
- [ ] **Character portrait upload** — Supabase Storage.

## Tier 3 — System completeness

- [ ] **Spaceship combat** — separate subsystem. The open design question is how to model ship state and flow its effects into character actions/rolls.
- [ ] **Environmental hazards (Survival Clocks)** — implements the rulebook's universal Survival Clock mechanic (`10 + CON + Survival levels` ticks per hazard, with named escalation states that apply pool penalties and other effects). Covers Hunger / Thirst, Radiation, Heat, Cold and Vacuum. The escalation states (`Hungry`, `Frostbite`, `Radiation Poisoning`, etc.) are the canonical "active conditions" — when this lands they auto-apply their pool modifier to rolls so we don't need a separate conditions panel.
- [ ] **Downtime activities + guided "Downtime" button** — guided flow that walks the user through performing a downtime action (Relax & Rest, Seek Inspiration, Train Skill, Modify / Repair Gear, Networking, Forge ID, Install Cyberware, etc.). The button presents the legal options, runs any required check (e.g. Seek Inspiration grants edge beyond the normal limit, capped at +50%), and applies the outcome to the character. 1x-per-level uses are tracked via the progression log from the level-up item.
- [ ] **Support / collaborative checks** — multi-player roll aggregation.
- [ ] **Homebrew content** — GM-defined custom talents / cyberware / equipment.
- [ ] **Live lobby updates** — new players joining and new characters being created should appear in the lobby without a manual refresh. Realtime auth on the browser client is now in place (see below), so filtered postgres_changes subscriptions on `game_id` should work. Just needs the lobby route to subscribe.
- [x] **Explicit realtime auth on the browser client** — `getSupabaseBrowserClient` now calls `supabase.realtime.setAuth(...)` with the current session's access token (and re-calls on `onAuthStateChange`). Required for `game_id=eq.X` filtered subscriptions on characters / game_state to work (which the combat tracker depends on for HP / AP propagation).
- [ ] **Favorite / starred skills** — let players mark frequently used skills as favorites; favorited skills float to the top of the skills panel with a star or bookmark icon. Per-character setting (different characters lean on different skills), toggled from the skills list itself.

## Key design decisions

- **Progression granularity**: tracked per level, not per edit. Captures level-up choices and 1x-per-level downtime ability uses. Light, story-shaped, not an audit trail.
- **Active effects**: ad-hoc penalties/bonuses are entered as the modifier on the DiceRoller per-roll — no persistent "conditions" list. Long-running named states (Hungry, Frostbite, etc.) ride along with the Tier 3 Survival Clocks work, where they auto-apply their pool modifier.
- **NPCs**: lightweight, not full character sheets. GM-only.
- **Action cards**: unified pattern across talents / cyberware / equipped weapons — single "use" button that pre-fills the dice roller.
- **Data-first for content panels**: a panel without its JSON content is useless. Import order: cyberware JSON → cyberware panel; equipment JSON → inventory panel.
- **Out of scope for now**: tactical maps / encounter builder, marketplace, PDF export, character templates, per-session roll log.
