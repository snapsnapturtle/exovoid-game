# Spaceship Configuration (Ship Builder) — v1

## Context

Issue #49 tracks the spaceship subsystem design. This plan covers the first slice: a collaborative **ship builder** so a game's members can create and configure ships (class, modules, weapons, quadrant allocations) with live-computed derived stats (capacity, power balance, asset cost, hull/armor/shields), plus simple damage tracking. Ship **combat** (stations, AP, crew assignment) is a later phase — the schema must leave room for it but implements none of it.

Source of truth for content: `rules/Exovoid Ship Builder.xlsx` (sheets: Space Ships, Ship Systems, Ship Weapons, plus a Ship Builder calc sheet whose formulas define the math). Rulebook sections: "Party Ship", "Spaceships & Combat" (esp. Armor & Shield Quadrants), "Repair Ship".

### Decisions made with the user

- **Scope**: builder + current/max damage tracking for hull, armor, shields. No ammo/malfunction tracking yet.
- **Assets**: display-only. Show total asset cost prominently; **no** party-budget hint, **never** touch `game_state.assets` (players may acquire ships outside the starting budget).
- **Validation**: warn, don't block. Over-capacity / incompatibilities = warning; negative power = info/amber (legal — energy is redistributed each round). Config always saves.
- **Quadrants & arcs in v1**: armor + shield points distributed across fore/aft/port/starboard; arc-based weapons get a firing-arc picker (turrets are 360°).
- **Visibility**: `visible_to_players` flag (default true) so the GM can prep enemy ships — mirrors the NPC pattern.
- **Module effects**: structured, computed into derived stats (like cyberware passive effects). Flavor-only effects stay text.
- **Editing**: live collaborative edit like the character sheet (800ms debounce autosave, realtime, last-write-wins) + a **Duplicate ship** action for experimentation. No draft/commit machinery.
- **Permissions**: any game member can create, edit, duplicate, and delete (delete behind a confirm dialog). Hidden ships only visible/editable by GM + creator (falls out of the visibility predicate).
- **Math**: exact fractions internally (matches the spreadsheet), display rounded to 1 decimal. `Math.ceil` only where the rules say "round up" (% effects, shield points).
- **Shield formula basis**: class **base** hull (Corvette = 18 regardless of modules). ⚠️ Open rules question — confirm with the game designer; leave a code comment at the shield computation.
- **Duplicate warnings**: Hull Extension (explicit once-only) + FTL drives, board computers, cloaking devices, and variants warn on duplicates. Steel Plates + Titanium Alloy warn as incompatible.

## Verified calculation rules (from the xlsx Ship Builder formulas)

- module capacityCost = `capacityMultiplier × class.systemsCapacity + capacityModifier` (no rounding; can be negative — Hull Extension −0.2 multiplier _grants_ capacity)
- module powerDelta = `−(powerRequirementMultiplier × capacityCost + powerRequirementModifier)` (generators have negative modifiers ⇒ positive delta)
- module assetCost = `assetCostMultiplier × capacityCost + assetCostModifier`
- weapon: flat `capacityCost`, powerDelta = `−powerRequirement`, flat `assetCost`
- capacityTotal = `systemsCapacity` (×1.25 if State-Of-The-Art); capacityRemaining = total − Σ module+weapon capacity
- powerBalance = `|basePowerGenerated| − basePowerNeeded + Σ deltas`
- totalAssetCost = `(class assetCost + Σ modules + Σ weapons)` ×0.75 Used / ×1.25 State-Of-The-Art
- "Used Ship" and "State-Of-The-Art Variant" rows in Ship Systems are ship-wide **variants**, not modules.

## Implementation steps

### 1. Static data (CSV → JSON pipeline)

- Export the three xlsx sheets as CSVs into `rules/`: `Exovoid Content - Space Ships.csv`, `Exovoid Content - Ship Systems.csv`, `Exovoid Content - Ship Weapons.csv` (xlsx already parsed; generate CSVs from it via a one-off script rather than asking the user to re-export).
- Extend `scripts/import-rules.mjs` with three sections producing:
  - `src/data/ship-classes.json` — all numerics parsed; normalize `basePowerGenerated` (stored negative) to positive `powerGenerated`.
  - `src/data/ship-systems.json` — forward-fill `systemType`; parseFloat multipliers/modifiers; tag `Used Ship` / `State-Of-The-Art Variant` rows `kind: 'variant'`, rest `kind: 'module'`. Wrap in `preserveEffects` keyed by `systemName` (cyberware pattern).
  - `src/data/ship-weapons.json` — keyed by `shipWeapon` + illustrative `shipWeaponName`; `type: 'Arc Based' | 'Turret'`; nullable magazine/magCost (lasers); keep `reloadAP` as raw string (display-only in v1); normalize railgun range artifacts (`optimalRange "0-1.000"` → `0–1000`, `maximumRange 1000000` → null/"Unlimited").
- Hand-annotate structured `effects` on ~13 modules (preserved on re-import):

```ts
type ShipModuleEffect =
  | {
      kind: 'stat'
      stat:
        | 'speed'
        | 'maneuverability'
        | 'hull'
        | 'armorDurability'
        | 'primarySoak'
        | 'secondarySoak'
      value: number
    }
  | { kind: 'statPct'; stat: 'hull' | 'armorDurability'; pct: number } // ceil(classBase × pct/100), additive
  | { kind: 'shield'; hullFactor: number; flat: number; regenPct: number } // points = ceil(classBaseHull × factor) + flat
```

Thrusters (speed/maneuv.), Steel Plates +50% armor, Titanium Alloy (+1/+1 soak, +25% armor), Carbon Nanotube +3 primary soak, Structural Enhancements +25% hull, the 4 shield systems, Docking Pylon `hull −10`. Conditional effects (Reactive Armor, Reflective Coating) stay flavor text. Variant math lives as constants in game logic, not annotations.

### 2. Game logic: `src/lib/game-logic/ships.ts` + `ships.test.ts`

Pure functions (derived stats never stored): `moduleCapacityCost`, `modulePowerDelta`, `moduleAssetCost`, `computeShipStats(config)`, `computeShipWarnings(config, stats)`.

`ShipDerivedStats`: capacityTotal/Used/Remaining, powerBalance, totalAssetCost, speed, maneuverability, hullMax, armorMax, primarySoak, secondarySoak, `shield: { points, regenPct } | null`, malfunctionModifier (+2 Used, display-only), per-source contribution lists for breakdown UI.

Warnings: `over-capacity` (warning), `negative-power` (info), `incompatible-modules` (Steel+Titanium), `duplicate-unique-module` (Hull Extension, FTL drives, board computers, cloaking devices), `unassigned-arc` (info), `armor-overallocated` / `shield-overallocated`.

Tests: golden values recomputed from the spreadsheet (Fusion Generator on Corvette; Ion Thrusters on Frigate: cap 6.5, power −1.625, cost 3.25; Hull Extension negative-capacity case; Used/SOTA totals; shield points per class; every warning trigger). Run `npm run test:run`.

### 3. Migration: `supabase/migrations/<ts>_ships.sql`

```sql
create table public.ships (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null default '',
  visible_to_players boolean not null default true,
  config jsonb not null,
  damage jsonb not null default '{"hullCurrent":null,"armorCurrent":null,"shieldCurrent":null}',
  notes text not null default '',
  created_at/updated_at timestamptz
);
```

- FK covering indexes on `game_id`, `created_by`; reuse the `update_updated_at` trigger fn from 001.
- RLS (mirror `20260523150831_npcs.sql`): SELECT/UPDATE/DELETE = member of game (`get_user_game_ids()`) AND (`visible_to_players` OR creator OR GM); INSERT = member + `created_by = (select auth.uid())`. All `auth.uid()` wrapped in `(select ...)`.
- `replica identity full` + add to `supabase_realtime` publication. **Then `supabase stop && supabase start`** and verify `pg_publication_tables`; run advisors (`mcp__local-supabase__get_advisors`).

### 4. Types

Regenerate the generated block in `src/lib/types/database.ts`; append app types:

```ts
type FiringArc = 'fore'|'aft'|'port'|'starboard'
type ShipQuadrants = Record<FiringArc, number>
type ShipVariant = 'standard'|'used'|'state_of_the_art'
type ShipModuleEntry = { id: string; moduleRef: string }                       // duplicates legal
type ShipWeaponEntry = { id: string; weaponRef: string; name?: string; arc?: FiringArc }
type ShipConfig = { classRef; variant; modules; weapons; armorAllocation: ShipQuadrants; shieldAllocation: ShipQuadrants }
type ShipDamage = { hullCurrent: number|null; armorCurrent: ShipQuadrants|null; shieldCurrent: ShipQuadrants|null }  // null = full/mirrors allocation
type Ship = row with config/damage narrowed
```

`null`-as-full avoids drift when allocations or class change (same trick as NPC `health_current`).

### 5. Server functions: `src/lib/server/ships.ts`

Follow `src/lib/server/npcs.ts` conventions (`createServerFn` + `.validator()` + `auth.getUser()` gate; RLS does authz):
`createShip({gameId, name, classRef})` (default config: standard variant, empty lists, zeroed quadrants), `getShip`, `listShips`, `updateShip` (shape-sanity validation only — never reject warn-level rule violations), `duplicateShip` (copy config, "Copy of …", reset damage, **no GM gate**), `deleteShip`.

### 6. Hooks

- `src/lib/hooks/useShip.ts` — direct analog of `useCharacter.ts` (latestRef snapshot, 800ms debounce, pendingRef-gated realtime merge, flushSave, unmount flush; register with `useReportSave`). Saves the whole row in one `updateShip`. Don't generalize `useCharacter` in v1.
- `src/lib/hooks/useRealtimeShip.ts` — clone of `useRealtimeCharacter` (mount refetch + UPDATE subscription via `useRealtimeSubscription`, never raw `supabase.channel`).

### 7. Routes & components

No tab nav exists — game sections are lobby cards. So:

- `src/routes/_app.games.$gameId.ships.tsx` — layout route, loader `listShips`, `<Outlet/>` (mirror `npcs.tsx`).
- `_app.games.$gameId.ships.index.tsx` — roster grid (name, class, hull, asset cost, Hidden badge); "New ship" Button → **Modal** (name + class picker as selectable cards, `ring-2 ring-accent-900` selection) → `createShip` → navigate.
- `_app.games.$gameId.ships.$shipId.tsx` + `.index.tsx` — loader `getShip`; `useRealtimeShip` → `<ShipSheet>` (mirrors `characters.$characterId` pair; layout route leaves a slot for the future crew/stations tab).
- `src/components/ships/`:
  - `ShipSheet.tsx` — owns `useShip`; builder left, status rail right.
  - `ShipHeader` — name Input, class + variant selects, GM-only visibility toggle, Duplicate (`secondary`) + Delete (`danger`, confirm Modal).
  - `DerivedStatsPanel` — capacity bar (amber when over), power balance (amber when negative), speed/maneuverability/soak/hull/armor/shields, **total asset cost prominent** (1-decimal). No budget hint.
  - `WarningsPanel` — `<Alert variant="warning|info">` list.
  - `ModulesPanel` — installed modules grouped by systemType (capacity/power/cost per row, 1-decimal); "Add module" Modal with `stickyHeader` search + type filter pills (reuse the inventory catalog-modal pattern in `src/components/inventory/`).
  - `WeaponsPanel` — stat rows; arc-based weapons get a 4-segment arc picker (cell-style selection: `border-accent-600 bg-accent-300`); turrets show "Turret · 360°".
  - `QuadrantAllocator` — two 2×2 `InlineStepper` grids (armor, shields) + remaining-pool readout; over-allocation warns, never blocks.
  - `DamagePanel` — hull `Stepper` (`min={0}`); per-quadrant armor/shield `InlineStepper` grids resolving `null` → allocation.
  - All controls on the shared height scale; sentence-case button labels; disabled-hover convention.
- Lobby entry: Ships card in `_app.games.$gameId.index.tsx` (mirror the NPCs card — list preview, Hidden badge, "New ship", "View all ships →").

## Verification

1. `npm run test:run` — game-logic golden tests vs spreadsheet values.
2. `npm run build` + `npm run format:check`.
3. `supabase db reset`, restart stack, verify realtime publication, run Supabase advisors.
4. Manual (dev server is user-run — don't start it): create ship → builder; add modules/weapons across classes and spot-check capacity/power/cost against the xlsx Ship Builder tab; trigger each warning and confirm saves still go through; duplicate + delete; two-browser live edit (realtime merge); GM-hidden ship invisible in a player session; quadrant allocation + damage steppers; `/styleguide` alignment for any new control.

## Open items (not blocking)

- ⚠️ Shield "Base Hull" basis (class base vs modified hull) — using class base; **confirm with the game designer**. Code comment at the computation site.
- `reloadAP` strings (`"8 (per rocket)"`) stay raw until ship combat needs parsed AP.
- Later phases (separate issues per #49): crew stations (`config.stations` or new column), ship combat tracker integration, ammo/malfunction tracking.
