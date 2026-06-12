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
- `src/lib/types/` — TypeScript types. `database.ts` is generated (`npm run gen:types`, never hand-edit); `domain.ts` holds the hand-written types that narrow JSON columns to runtime shapes (`Character`, `CombatState`, …)
- `supabase/migrations/` — SQL migrations

## Conventions

### Routing

- Pathless layout routes use `_` prefix: `_app.tsx` wraps authenticated routes
- Dynamic params use `$`: `$gameId`, `$characterId`
- Dot separators for path segments: `_app.games.$gameId.tsx` = `/_app/games/:gameId`

### Server Functions

- All database writes go through `createServerFn` in `src/lib/server/`
- Always validate auth via `supabase.auth.getUser()` in server functions
- Use `.validator()` for input validation (`.inputValidator()` is the deprecated alias in current TanStack Start)

### Game Logic

- All derived stats are computed client-side, never stored in DB
- All division uses `Math.ceil` (round up) — confirmed by game table ruling
- Attribute average for skills: ceil(sum / count)
- 7 attributes: CON, STR, AGI, INT, EDU, PER, COO
- 24 skills, each linked to 1-2 attributes

### Styling

Adopts Vercel's [Geist design system](https://github.com/geist-org) — chrome (1px hairline borders, near-pure-black surfaces) plus the full Geist colour palette.

- **Backgrounds** (`background-100`, `background-200`) — page and element bgs, defined in hsla.
  - `background-100` (`#000`): default — use this for the page and for most elements.
  - `background-200` (`#0a0a0a`): secondary — sits one step lighter for subtle elevation, reach for it only when a surface needs differentiation from the default page.
- **Semantic ramps** (each 100–1000, defined in `src/styles/app.css`):
  - `gray-*` — neutral (Geist's official gray, overrides Tailwind's default gray; hsla)
  - `accent-*` — teal, the primary brand colour (oklch)
  - `danger-*` — red (oklch)
  - `warning-*` — amber (oklch)
  - `success-*` — green (oklch)
  - Extended (defined, opt-in): `blue-*`, `purple-*`, `pink-*` (oklch)
- **Ramp positions — use these, not invented shades.** Every ramp obeys the same semantic:
  - **100–300: component backgrounds.** `100` default, `200` hover, `300` active. On a page sitting on `background-100`, an interactive element can be transparent at rest and pick up `<color>-100` / `<color>-200` / `<color>-300` on hover / active. For smaller always-visible elements like badges, start at `<color>-200` or `<color>-300` directly.
  - **400–600: borders.** `400` default, `500` hover, `600` active.
  - **700–800: high-contrast backgrounds.** `700` default fill, `800` hover. This is the primary/danger button treatment.
  - **900–1000: text and icons.** `900` for secondary text, `1000` for primary text/icons. Brand-tinted text on dark uses `<color>-900` (e.g. `text-accent-900`).
- All interactive elements need hover/focus states.

**Typography**: Inter v4.1 Variable, self-hosted from the canonical rsms.me build at `src/styles/fonts/InterVariable.woff2` (declared via `@font-face` in `app.css`). Don't switch to `@fontsource-variable/inter` — its WOFF2 ships a 10-feature subset that strips `zero`, all `cv*`, and all `ss*`, so the OpenType features below would silently fail. The font family and feature defaults are configured via two `@theme` tokens that Tailwind v4 preflight reads on its `html` rule and inherits across the document: `--font-sans` (InterVariable + fallbacks) and `--default-font-feature-settings: "tnum", "zero", "cv09", "cv02", "cv03", "cv04"`. That gives tabular figures, slashed zero, and Inter's alt 3 / 4 / 6 / 9 glyphs everywhere. Avoid Inter's `ss01` ("Open digits") — it substitutes every digit including `0`, which overrides the slashed-zero feature. Don't combine `font-feature-settings` and `font-variant-numeric` on the same element; some browsers drop one when the other is set.

**Single border tone**: every panel divider and card border uses `border-gray-400` (Geist's default-border position). Don't reach for darker tones or semi-transparent variants for internal dividers — depth in this system comes from that one hairline border, not from filled-color contrast.

**Modal elevation**: just the border, no shadows. Geist treats the 1px border as the elevation; drop shadows aren't part of the language for in-flow surfaces. Modals and drawers lean on `border-gray-400` for their edge.

**Elevation for genuinely floating elements** (toasts, tooltips, FAB buttons): use the shared `.elevation-float` class in `src/styles/app.css`. It layers a soft white outer glow (so the element silhouettes against the pure-black page bg) with a strong dark drop shadow (so it still reads as lifted when it overlaps lighter surfaces like cards/modals). Don't reach for `shadow-xl`/`shadow-2xl` directly — on `background-100` (#000) a black-tinted Tailwind shadow is physically invisible.

**Selection state** (selectable cards, multi-select cells, "this one is picked" highlights): accent (teal) is fine — primary actions and selection sit close enough in this UI that doubling up reads as coherent rather than ambiguous. For card-style selectables that already have their own bg/border, lift the selection with `ring-2 ring-accent-900`. For cell-style selectables (the malfunction table is the canonical example), use `border-accent-600 bg-accent-300 text-white` selected and `hover:border-accent-500 hover:bg-accent-200` to anticipate the selection on hover. (Tried a separate purple for selection earlier — visually didn't land.)

### UI primitives

Live preview of every primitive: `/styleguide` (route `src/routes/_app.styleguide.tsx`). Open it whenever you're adding a new variant or just want to eyeball the catalog.

- **`<Button>`** (`~/components/ui/Button`) — variants:
  - `primary` (default): filled accent (`bg-accent-700`, hover `bg-accent-800`) — the single main action on a surface (form submit, modal CTA, "Roll", "Save")
  - `secondary`: tinted-accent — alternate action with similar weight, but lower contrast (`bg-accent-700/15`, hover `bg-accent-700/25`)
  - `subtle`: neutral filled chip (`bg-gray-400`, hover `bg-gray-500`) — for **in-play interactive controls** (stepper +/- buttons, inline micro-buttons on attribute/skill/AP rows). Sits between `secondary` (too noisy) and `ghost` (too hidden) — visible at rest as a soft dark fill, no border, no colour. Bg lands on the _border_ positions of the gray ramp rather than 100/200/300; that's intentional because 100/200/300 are near-invisible on the pure-black page bg.
  - `ghost`: transparent-rest, fills with `bg-gray-100` on hover — low-emphasis or supporting action (Cancel, Back, navigation). No border, no background at rest, so it reads as text until the cursor lands on it.
  - `danger`: filled red (`bg-danger-700`, hover `bg-danger-800`) — destructive actions (Delete, End). Same high-contrast treatment as `primary`, swapped to the danger ramp.
  - High-contrast filled variants (primary, danger) follow the Geist `700 → 800` convention: 700 at rest, 800 on hover (darker, more saturated — Geist hovers go darker, not lighter).
  - **Active press feedback** (the `scale(0.98)` squeeze on click) is scoped to the `<Button>` primitive only via `buttonClasses()`. Plain `<button>` elements that aren't styled as buttons (talent nodes, dice result cards, etc.) deliberately don't get this — the press should signal "this is a button" rather than "this is interactable." If a `<button>` should feel like a real button, render it via the primitive (or use the `subtle` variant for chip-sized in-play controls).
  - Sizes: `md` (default, 32px), `sm` (24px), `xs` (20px) — see **Control heights** below. For non-button anchors (`<Link>`, `<a>`), import `buttonClasses(variant, size)` from the same module and pass it to `className`.
  - **Label casing**: button labels are sentence case — the first word capitalised, the rest lowercase unless they're proper nouns ("Roll", "Save changes", "Add weapon"). Not title case ("Add Weapon"), not all-lowercase ("add weapon"), not all-caps. Glyphs like `+`, `×`, `−` are fine on their own; if a glyph leads a multi-word label, the next word is still capitalised ("+ Custom").
- **`<Modal>`** (`~/components/ui/Modal`) — backdrop, centered card, header (title + required X close), scrollable body, optional `stickyHeader` slot (pins a search bar / filter pills / status line below the title while the body scrolls), optional `footer` slot for right-aligned action buttons, and optional `footerLeft` slot for inline form fields paired with the buttons (switches the footer to a split layout). Every dialog in the app uses this primitive — don't hand-roll backdrop/card chrome. At minimum every dialog must render `<ModalCloseButton>` in the top-right (the primitive handles this). A footer "Cancel" text button is reserved for the _cancel_ role next to a confirm action; pure-informational modals get just the X. Backdrops use `bg-background-100/80` (pure black at 80% opacity, no blur) so the modal card crisply silhouettes against a darkened page; the entrance is a 140ms fade+pop via `.modal-backdrop-in` and `.modal-card-in` (in `app.css`).
- **`<Alert>`** (`~/components/ui/Alert`) — inline status banner with `danger | warning | info` variants. Use for standalone messages in a page or modal, not for buttons (destructive button actions are `<Button variant="danger">`).
- **`<Stepper>`** (`~/components/ui/Stepper`) — shared label + +/- value control used both on the character sheet's Health/Edge band and inside each combat-tracker participant card. Step buttons are the `subtle` `sm` Button squared off to 24×24 via `w-6 px-0`, with a `text-lg` value display. Pass `min={0}` to bound at zero; omit `min` for fields that can legally go negative (AP under penalty).
- **`<InlineStepper>`** (`~/components/ui/InlineStepper`) — tiny `[− value +]` group for attribute/skill/XP rows where the bigger `<Stepper>` card would be visually too heavy. Step buttons are the `subtle` `xs` Button squared off to 20×20 via `w-5 px-0` — there's no separate hand-rolled recipe anymore; reach for this primitive rather than redeclaring micro-button classes. It's deliberately flexible so most inline +/- spots can use it: bound the buttons with `min`/`max`, or — when the disable rule isn't a plain numeric floor/ceiling (point budgets, a `busy` flag, bump caps) — pass `decrementDisabled` / `incrementDisabled` (they OR with the min/max bounds). The readout is always the raw `value`; convey state (e.g. "this was changed") through `valueClassName` colour rather than custom content (the level-up skills stepper shows the final number in `text-accent-900` when raised). The readout's **spacing is component-owned** (a baked-in `px-1.5`) so every stepper reads identically — `valueClassName` is for text styling only (size/weight/colour/`tabular-nums`); don't pass widths (`min-w-*`/`w-*`) or it'll reintroduce uneven gaps. Pass `valueClassName="hidden"` when the caller renders the value itself (e.g. AttributesPanel shows the value as a big number above the buttons). The one deliberate hold-out that doesn't use it is the character-creation **attributes** stepper (square `subtle` `xs` Buttons, value rendered as a large number above the +/- pair); the XP +/- in `CharacterHeader` is likewise square `subtle` `xs` Buttons (no value sits between them).
- **Disabled hover convention**: disabled buttons must not change on hover and should show the `not-allowed` cursor. Gate every hover declaration behind `not-disabled:` and pair it with `disabled:cursor-not-allowed`. The `<Button>` and `<Stepper>` primitives bake this in; match the convention on any inline button recipe.

**Control heights**: buttons, inputs and steppers share one height scale so they line up when placed in the same row — `xs` 20px, `sm` 24px, `md` 32px, plus an input-only `lg` 40px. The heights are achieved with **border-compensated padding, not a fixed `h-*`** (a hard project constraint: don't reach for `h-*` to size a control). The mechanism: every `<Button>` carries a 1px border at all times — bordered variants (`secondary`) colour it, the rest use `border-transparent` — so a borderless and a bordered button at the same size are pixel-identical (filled variants stay seamless because `background-clip` defaults to `border-box`, painting the fill under the transparent border). With the border thus constant, one SIZE map sets the padding: `xs py-[2px]`, `sm py-[3px]`, `md py-[5px]`, each paired with a pinned line-height (`xs` needs an explicit `text-[10px]/[14px]` since arbitrary font-sizes carry no default leading). Inputs are always bordered and reuse the **same** `py`/text values for `sm`/`md`, so an `<Input>` and a `<Button>` at a matching size align; `lg` (input-only, `py-[7px]` + `text-base`) has no button peer. To size a glyph-only square control (stepper +/- buttons), take the matching Button size and constrain **width** only (`w-6`/`w-5` + `px-0`) — width is fair game, height is not. New controls that sit in a control row must land on this scale; verify side-by-side on `/styleguide` ("Control heights & alignment").

- **Auto-save pattern**: any per-character field that takes rapid clicks should pipe through the optimistic-state + 800ms-debounced-save pattern. Two hooks cover this:
  - `useCharacter` (`src/lib/hooks/useCharacter.ts`) — owns the _entire_ character snapshot on the sheet; one debounce, one batched save.
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
npm run gen:types     # Regenerate src/lib/types/database.ts from the local DB
```

### Database types

`src/lib/types/database.ts` is a **generated artifact** — `npm run gen:types` overwrites it from the local Supabase schema. Re-run it after every migration; never hand-edit it. It's excluded from Prettier (raw double-quoted CLI output), so leave the formatting as the generator emits it. Hand-written types that narrow its `Json` columns live in `domain.ts` (which imports from `database.ts`).

The `supabase` CLI used for generation is a **pinned devDependency** (not the brew CLI) — `npm run gen:types` runs it via `node_modules/.bin`, so the generator version is consistent and dependabot keeps it current. Bumping that dependency is the only way the generator version changes; brew's `supabase` is still fine for running the stack day-to-day.

One gotcha when regenerating: **run `supabase db reset` first.** `gen:types` reflects whatever is in your _running_ local DB. If you've checked out a feature branch (e.g. `ship-builder` and its `ships` table), reset back to a clean, migrations-only state or its tables will leak into the committed file.

## Environment Variables

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Production / hosting

Vercel + Supabase Cloud. The local Supabase CLI is linked to the cloud project `ndvutykwkidazmvtktby` (Frankfurt, region `eu-central-1`) — `supabase db push` deploys the migrations in `supabase/migrations/` to production. The Vercel project, build settings, and `VITE_SUPABASE_*` env vars live in the `../infrastructure` repo (`exovoid-game.tf`); never set them in the Vercel dashboard manually — Terraform will reconcile them away.

The build adapter is `nitro/vite`. Nitro auto-detects Vercel via the `VERCEL=1` env var that Vercel sets during build, producing a `.vercel/output/` directory in the Build Output API shape. Locally the same plugin emits a Node.js server to `.output/server/index.mjs` (run via `npm run start`, or `npx vite preview` for a quick check).
