# Exovoid Game Companion

A digital companion tool for the **Exovoid** tabletop RPG system. Manage characters, roll dice, and track your adventures in the void of space.

## Status

Planned work lives on the [issue tracker](https://github.com/snapsnapturtle/exovoid-game/issues) — filter by label (`homebrew`, `talents`, `npc`, `combat`, `survival`, etc.) or look at [`tracking`-labelled issues](https://github.com/snapsnapturtle/exovoid-game/labels/tracking) for the umbrella efforts.

## Setup

### Prerequisites

- Node.js 20+
- Supabase CLI (`brew install supabase/tap/supabase`)

### Installation

```bash
git clone https://github.com/snapsnapturtle/exovoid-game.git
cd exovoid-game
npm install
```

### Supabase Local Development

```bash
supabase init          # First time only
supabase start         # Starts local Supabase (Postgres, Auth, etc.)
supabase db reset      # Run migrations
```

After `supabase start`, copy the printed `API URL` and `anon key` into `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Production runs on **Vercel** against a **Supabase** project hosted in Central EU (Frankfurt, project ref `ndvutykwkidazmvtktby`).

- The Vercel project and its env vars are managed via Terraform in the `infrastructure` repo (`exovoid-game.tf`). Pushing to `main` triggers a deploy.
- Migrations: run `supabase db push` against the linked project to apply new SQL to production.
- The build uses Nitro's Vercel Build Output API integration (`nitro/vite` plugin in `vite.config.ts`), which Vercel auto-detects — no framework preset needs to be set.

## Game Rules

The complete Exovoid rule set is in `Exovoid game rules.md`. Key mechanics implemented:

- **7 Attributes**: CON, STR, AGI, INT, EDU, PER, COO (28-point budget)
- **24 Skills**: Each linked to 1-2 attributes
- **Derived Stats**: Health, Vigilance, Heft, Edge, Action Points, Speed, Cyber Immunity
- **Dice Pool**: Standard + Aptitude + Expertise dice based on attribute/skill levels
