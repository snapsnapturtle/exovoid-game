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

- Dark theme using custom `void-*` color scale
- Accent color: indigo (`accent-*`)
- Cyber color: cyan (`cyber-*`)
- All interactive elements need hover/focus states

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
