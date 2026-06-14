// ============================================================
// Shared zod building blocks for server-function input validation.
//
// Every `createServerFn().validator(...)` in this folder passes a zod schema
// (TanStack Start accepts a Standard Schema / `parse`-able object directly), so
// payloads are actually checked and stripped at runtime — not just
// type-ascribed at compile time. These primitives mirror the hand-written
// runtime shapes in `~/lib/types/domain`; per-function schemas compose them.
//
// Convention: top-level argument objects use `z.object` (unknown keys are
// silently stripped, so they can never reach PostgREST). Column allow-lists
// that feed straight into `.update()` use `z.strictObject` so an unexpected
// key (`credits`, `user_id`, …) is rejected loudly rather than forwarded.
// ============================================================

import { z } from 'zod'
import type { Json } from '~/lib/types/database'

/** A database row id. All our ids are uuids (Postgres uuid columns or
 *  `crypto.randomUUID()`), so reject anything that isn't one early. */
export const uuidSchema = z.uuid()

/** The 7 Exovoid attributes. Base (pre-bonus) values stored as JSONB; only the
 *  shape and integer-ness are enforced here — creation budget caps live in
 *  `validateCreation`, GM edits are deliberately unconstrained. */
export const attributesSchema = z.object({
  con: z.number().int(),
  str: z.number().int(),
  agi: z.number().int(),
  int: z.number().int(),
  edu: z.number().int(),
  per: z.number().int(),
  coo: z.number().int(),
})

/** Skill id → level map. */
export const skillsSchema = z.record(z.string(), z.number().int())

export const talentEntrySchema = z.object({
  name: z.string(),
  career: z.string(),
  tier: z.number().int(),
  acquiredAt: z.number().int(),
  granted: z.boolean().optional(),
})

export const injuryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  severity: z.number().int(),
  modifier: z.number().int(),
  treated: z.boolean(),
  addedAt: z.string(),
})

export const pendingBonusSchema = z.object({
  id: z.string(),
  label: z.string(),
  modifier: z.number().int(),
  source: z.string(),
  addedAt: z.string(),
})

export const derivedStatBonusesSchema = z.object({
  maxHealth: z.number().int().optional(),
  maxEdge: z.number().int().optional(),
  cyberImmunity: z.number().int().optional(),
})

export const pendingSupportSchema = z.object({
  id: z.string(),
  diceRollId: z.string(),
  supporterUserId: z.string(),
  supporterCharacterId: z.string().nullable(),
  supporterName: z.string(),
  skillId: z.string(),
  skillName: z.string(),
  // Aggregated symbol counts (see summarizeRoll) — always non-negative ints.
  // Bounding them closes a cheating surface via rollDice's preAbsorbedSupports.
  summary: z.record(z.string(), z.number().int().min(0)),
  createdAt: z.string(),
})

/** Symbol-die pool: `Partial<Record<DieType, number>>`. */
export const rollPoolSchema = z.object({
  standard: z.number().int().min(0).optional(),
  aptitude: z.number().int().min(0).optional(),
  expertise: z.number().int().min(0).optional(),
  injury: z.number().int().min(0).optional(),
})

/** Polyhedral pool: `Partial<Record<PolyDieType, number>>`. */
export const polyPoolSchema = z.object({
  d4: z.number().int().min(0).optional(),
  d6: z.number().int().min(0).optional(),
  d8: z.number().int().min(0).optional(),
  d10: z.number().int().min(0).optional(),
  d12: z.number().int().min(0).optional(),
  d20: z.number().int().min(0).optional(),
  d100: z.number().int().min(0).optional(),
})

/** Inventory owner — a character or the shared game bag. */
export const ownerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('character'), characterId: uuidSchema }),
  z.object({ type: z.literal('game'), gameId: uuidSchema }),
])

/** Any JSON-serializable value — for the per-source `picks` blob whose shape is
 *  agreed in app code, not the DB. Still rejects functions/undefined/NaN. */
export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
)
