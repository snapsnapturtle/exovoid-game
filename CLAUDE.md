# Exovoid Game Support Tool

## Overview

Digital companion app for the Exovoid tabletop RPG. Think D&D Beyond for a sci-fi TTRPG system.

## Tech Stack

- **Framework**: TanStack Start (React + TypeScript, file-based routing, server functions)
- **Backend**: Supabase (auth, Postgres, realtime subscriptions)
- **Styling**: Tailwind CSS v4

## Project Structure

- `src/routes/` — File-based routes. `_auth.*` = unauthenticated, `_app.*` = authenticated
- `src/components/` — React components organized by domain (ui, layout, character, game)
- `src/lib/supabase/` — Supabase client setup (browser + server)
- `src/lib/server/` — Server functions (auth, games, characters)
- `src/lib/game-logic/` — Pure game rule functions (attributes, skills, derived stats, dice)
- `src/lib/hooks/` — React hooks (useCharacter with auto-save)
- `src/lib/types/` — TypeScript types (database.ts will be auto-generated)
- `supabase/migrations/` — SQL migrations

## Conventions

### Routing

- Pathless layout routes use `_` prefix: `_app.tsx` wraps authenticated routes
- Dynamic params use `$`: `$gameId`, `$characterId`
- Dot separators for path segments: `_app.games.$gameId.tsx` = `/_app/games/:gameId`

### Server Functions

- All database writes go through `createServerFn` in `src/lib/server/`
- Always validate auth via `supabase.auth.getUser()` in server functions
- Use `.inputValidator()` for input validation (not `.validator()`)

### Game Logic

- All derived stats are computed client-side, never stored in DB
- All division uses `Math.ceil` (round up) — confirmed by game table ruling
- Attribute average for skills: ceil(sum / count)
- 7 attributes: CON, STR, AGI, INT, EDU, PER, COO
- 24 skills, each linked to 1-2 attributes

### Styling

Heavily inspired by Vercel's [Geist design system](https://github.com/geist-org). Hex tokens and chrome conventions mirror Geist:

- Dark theme using custom `void-*` color scale (near-pure-black ramp: `#000` → `#111` → `#1a1a1a` → `#333` → `#444`).
- Accent color: Vercel blue `#0070f3` (`accent-500`); hover `#3291ff` (`accent-400`), pressed `#0761d1` (`accent-600`).
- Cyber color: cyan (`cyber-*`) — reserved for combat-related semantic accents (weapons, etc.), not interchangeable with `accent-*`.
- All interactive elements need hover/focus states.

**Single border tone**: every panel divider and card border uses `border-void-600` (`#333`). Don't reach for `border-void-700` or semi-transparent variants for internal dividers — depth in this system comes from that one hairline border, not from filled-color contrast.

**Modal elevation**: just the border, no `shadow-xl`. Geist treats the 1px border as the elevation; drop shadows aren't part of the language. Floating elements that genuinely sit above the page (toasts, the scroll-to-top button) keep their drop shadows.

### UI primitives

- **`<Button>`** (`~/components/ui/Button`) — variants:
  - `primary` (default): filled accent — the single main action on a surface (form submit, modal CTA, "Roll", "Save")
  - `secondary`: outlined-accent — alternate action with similar weight
  - `ghost`: outlined-void — low-emphasis or supporting action (Cancel, Back, navigation)
  - `danger`: outlined-danger — destructive actions (Delete, End)
  - Sizes: `md` (default) and `sm`. For non-button anchors (`<Link>`, `<a>`), import `buttonClasses(variant, size)` from the same module and pass it to `className`.
- **`<Modal>`** (`~/components/ui/Modal`) — backdrop, centered card, header (title + required X close), optional footer slot. Six of the larger modals predate the wrapper and still render their own backdrop/card; if you touch one, prefer migrating to `<Modal>`. At minimum every dialog must render `<ModalCloseButton>` in the top-right. A footer "Cancel" text button is reserved for the *cancel* role next to a confirm action; pure-informational modals get just the X. Backdrops use `bg-black/60` + `backdrop-blur-sm`; the entrance is a 140ms fade+pop via `.modal-backdrop-in` and `.modal-card-in` (in `app.css`).
- **`<Alert>`** (`~/components/ui/Alert`) — inline status banner with `danger | warning | info` variants. Use for standalone messages in a page or modal, not for buttons (destructive button actions are `<Button variant="danger">`).
- **`<Stepper>`** (`~/components/ui/Stepper`) — shared label + +/- value control used both on the character sheet's Health/Edge band and inside each combat-tracker participant card. Bordered hover-accent buttons, `text-lg` (sm) or `text-2xl` (md) value display. Pass `min={0}` to bound at zero; omit `min` for fields that can legally go negative (AP under penalty).
- **In-row micro-buttons (+/-)** for attribute/skill/XP steppers use `h-5 w-5 shrink-0 bg-void-600 hover:bg-void-500 text-xs text-gray-300 transition disabled:opacity-30`. There's no shared component yet — match these classes when adding new ones.
- **Auto-save pattern**: any per-character field that takes rapid clicks should pipe through the optimistic-state + 800ms-debounced-save pattern. Two hooks cover this:
  - `useCharacter` (`src/lib/hooks/useCharacter.ts`) — owns the *entire* character snapshot on the sheet; one debounce, one batched save.
  - `useDebouncedNumber` (`src/lib/hooks/useDebouncedNumber.ts`) — field-level granularity for places where multiple participants and inventory items each need their own pending state (the combat page uses this for Health/Edge/Ammo/Durability). AP is the one sync exception because `game_state.combat` is a shared JSONB blob and the per-character `apBusy` guard prevents read-modify-write races.

### Data

- Character attributes stored as JSONB: `{"con":4,"str":4,...}`
- Skills stored as JSONB: `{"acrobatics":2,"firearms":5,...}`
- Supabase RLS policies enforce access control
- Realtime enabled on characters, game_members, dice_rolls, shared_notes, game_state

### Supabase patterns

**Adding realtime to a new table requires three steps, in this order:**

```sql
alter table public.foo replica identity full;
alter publication supabase_realtime add table public.foo;
```

…and then **restart the Supabase stack** (`supabase stop && supabase start`). The realtime container caches the publication list at startup, so `supabase migration up` alone doesn't pick up new tables. After the restart, verify with `select tablename from pg_publication_tables where pubname='supabase_realtime';` (the Supabase MCP can run this).

**Realtime subscribes via `useRealtimeSubscription` (in `src/lib/hooks/`) which awaits `ensureRealtimeAuth()` before joining the channel.** Don't subscribe directly via `supabase.channel(...).subscribe()` — Supabase's auth client hydrates the session asynchronously, so a channel that joins before the token is set is recorded with `claims_role: anon` in `realtime.subscription` and has every postgres_changes event silently dropped by RLS. If you ever see "subscribed channel but no events arrive," check `select claims_role, entity from realtime.subscription` — `anon` means the auth race regressed.

**RLS policies should wrap `auth.uid()` (and any `auth.*()` call) in `(select ...)`** — `(select auth.uid())` — so the planner evaluates it once per query instead of per row. Same goes for any SECURITY DEFINER helper used inside a policy.

**SECURITY DEFINER functions:** pin `set search_path = ''` on every one (search-path attacks). Trigger-only functions should `revoke execute … from public, anon, authenticated` — triggers still fire. Helpers that read the caller's identity should use `auth.uid()` internally rather than taking a `user_id` parameter — otherwise the `/rest/v1/rpc/<name>` endpoint becomes a public probe for arbitrary users.

**Foreign keys need covering indexes** — `create index if not exists foo_bar_id_idx on public.foo(bar_id);` per FK. The Supabase advisor (`mcp__local-supabase__get_advisors`) flags any that are missing.

**`pg_graphql_*_table_exposed` advisor warnings are not applicable** — we use PostgREST + supabase-js, not the GraphQL endpoint. Don't revoke SELECT on tables to "fix" them; it would break PostgREST.

## Development

```bash
npm run dev           # Start dev server on port 3000
npm run build         # Build for production
supabase start        # Start local Supabase
supabase db reset     # Reset DB and run migrations
```

## Environment Variables

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
